import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import type { Request, Response } from 'express';

const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Authorized 100 single-use 6-digit entry payment codes (kept strictly server-side)
const VALID_PAYMENT_CODES = new Set<string>([
  '583104', '729615', '416802', '935271', '268493',
  '841726', '397154', '652908', '174635', '908412',
  '526781', '713409', '482165', '659327', '241896',
  '875130', '364729', '592843', '817264', '435918',
  '761503', '294681', '638205', '951472', '183760',
  '704319', '529164', '846291', '315807', '972436',
  '458120', '691753', '237584', '804621', '563918',
  '129475', '748302', '386159', '915824', '672410',
  '254793', '839516', '471208', '693145', '128604',
  '957321', '342876', '786409', '519283', '864157',
  '203946', '735812', '491627', '628350', '170492',
  '943865', '356201', '812739', '574028', '269314',
  '687951', '430762', '951608', '314825', '726193',
  '580417', '193648', '847520', '265971', '609384',
  '752816', '481039', '936725', '158204', '824693',
  '370518', '615942', '249761', '783405', '502196',
  '968314', '137825', '694270', '358641', '821507',
  '476932', '205718', '739164', '584293', '912650',
  '346187', '670529', '198436', '853702', '421965',
  '765318', '290547', '634891', '517260', '948132',
]);

const ENFORCE_CODE_SYSTEM = false;

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.resolve(DATA_DIR, 'redeemed-codes.json');

interface RedeemedRecord {
  codeHash: string;
  usedAt: string;
  roomCode: string;
}

interface ActiveSession {
  roomCode: string;
  startedAt: number;
}

const usedCodeHashes = new Set<string>();
const activeSessions = new Map<string, ActiveSession>();
const failedAttemptsByIp = new Map<string, number[]>();

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 25;

let storeLock: Promise<void> = Promise.resolve();

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function withStoreLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = storeLock.then(fn, fn);
  storeLock = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function loadRedeemedStore(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (
          item &&
          typeof item === 'object' &&
          typeof (item as RedeemedRecord).codeHash === 'string'
        ) {
          usedCodeHashes.add((item as RedeemedRecord).codeHash);
        }
      }
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      console.error('Failed to read redeemed codes store:', err);
    }
  }
}

async function persistRedeemedRecord(record: RedeemedRecord): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  let existing: RedeemedRecord[] = [];
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      existing = parsed as RedeemedRecord[];
    }
  } catch {
    existing = [];
  }
  existing.push(record);

  const tempPath = path.resolve(DATA_DIR, `redeemed-codes.${crypto.randomUUID()}.tmp`);
  if (!tempPath.startsWith(DATA_DIR + path.sep)) {
    throw new Error('Invalid store path');
  }
  await fs.writeFile(tempPath, JSON.stringify(existing, null, 2), 'utf8');
  await fs.rename(tempPath, STORE_PATH);
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (failedAttemptsByIp.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  failedAttemptsByIp.set(ip, timestamps);
  return timestamps.length >= RATE_LIMIT_MAX_ATTEMPTS;
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const timestamps = (failedAttemptsByIp.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  timestamps.push(now);
  failedAttemptsByIp.set(ip, timestamps);
}

async function startServer() {
  await loadRedeemedStore();

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '16kb' }));
  app.use(express.text({ type: 'text/plain', limit: '4kb' }));

  app.post('/api/verify-code', async (req: Request, res: Response) => {
    const ip = getClientIp(req);
    if (ENFORCE_CODE_SYSTEM && isRateLimited(ip)) {
      res.status(429).json({
        ok: false,
        reason: 'rate_limited',
        message: 'Too many failed attempts. Please wait a few minutes and try again.',
      });
      return;
    }

    const rawCode =
      req.body && typeof req.body === 'object' && typeof req.body.code === 'string'
        ? req.body.code.trim()
        : '';

    if (!/^\d{6}$/.test(rawCode)) {
      res.status(400).json({
        ok: false,
        reason: 'invalid_format',
        message: 'Please enter a valid 6-digit payment code.',
      });
      return;
    }

    const result = await withStoreLock(async () => {
      if (ENFORCE_CODE_SYSTEM) {
        if (!VALID_PAYMENT_CODES.has(rawCode)) {
          recordFailedAttempt(ip);
          return {
            status: 401,
            body: {
              ok: false,
              reason: 'invalid_code',
              message: 'Invalid payment code. Please enter a valid 6-digit code.',
            },
          };
        }

        const codeHash = hashCode(rawCode);
        if (usedCodeHashes.has(codeHash)) {
          recordFailedAttempt(ip);
          return {
            status: 409,
            body: {
              ok: false,
              reason: 'already_used',
              message: 'This payment code has already been used and has expired.',
            },
          };
        }

        usedCodeHashes.add(codeHash);
        await persistRedeemedRecord({
          codeHash,
          usedAt: new Date().toISOString(),
          roomCode: `sk-${rawCode}`,
        });
      }

      const roomCode = `sk-${crypto.randomBytes(3).toString('hex')}`;
      const sessionToken = crypto.randomBytes(24).toString('hex');

      activeSessions.set(sessionToken, {
        roomCode,
        startedAt: Date.now(),
      });

      return {
        status: 200,
        body: {
          ok: true,
          sessionToken,
          roomCode,
        },
      };
    });

    res.status(result.status).json(result.body);
  });

  app.post('/api/end-call', (req: Request, res: Response) => {
    let token = '';
    if (req.body && typeof req.body === 'object' && typeof req.body.sessionToken === 'string') {
      token = req.body.sessionToken.trim();
    } else if (typeof req.body === 'string') {
      try {
        const parsed = JSON.parse(req.body) as { sessionToken?: unknown };
        if (typeof parsed.sessionToken === 'string') {
          token = parsed.sessionToken.trim();
        }
      } catch {
        token = '';
      }
    }

    if (token) {
      activeSessions.delete(token);
    }

    res.status(200).json({ ok: true });
  });

  app.post('/api/verify-session', (req: Request, res: Response) => {
    const token =
      req.body && typeof req.body === 'object' && typeof req.body.sessionToken === 'string'
        ? req.body.sessionToken.trim()
        : '';

    const session = token ? activeSessions.get(token) : undefined;
    if (!session) {
      res.status(401).json({ ok: false });
      return;
    }

    res.status(200).json({ ok: true, roomCode: session.roomCode });
  });

  if (!IS_PRODUCTION) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.use((_req: Request, res: Response) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sanskurti server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
