let sharedAudioCtx: AudioContext | null = null;

function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextCtor) return null;

  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioContextCtor();
  }
  return sharedAudioCtx;
}

export function unlockRingAudio(): void {
  const ctx = getOrCreateAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => undefined);
  }

  // Play a 1-sample silent buffer to guarantee iOS/Chrome gesture unlock
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {
    // Ignore if browser rejects silent buffer
  }
}

export async function triggerOutgoingRingBurst(): Promise<'playing' | 'blocked'> {
  const ctx = getOrCreateAudioContext();
  if (!ctx) return 'blocked';

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return 'blocked';
    }
  }

  if (ctx.state !== 'running') {
    return 'blocked';
  }

  const now = ctx.currentTime;

  const scheduleTone = (startOffset: number, duration: number) => {
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    // Warm dual-tone outgoing video call ringback (440 Hz + 480 Hz)
    oscA.type = 'sine';
    oscB.type = 'sine';
    oscA.frequency.setValueAtTime(440, now + startOffset);
    oscB.frequency.setValueAtTime(480, now + startOffset);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1250, now + startOffset);

    gain.gain.setValueAtTime(0.0001, now + startOffset);
    gain.gain.exponentialRampToValueAtTime(0.16, now + startOffset + 0.04);
    gain.gain.setValueAtTime(0.16, now + startOffset + duration - 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    oscA.start(now + startOffset);
    oscB.start(now + startOffset);
    oscA.stop(now + startOffset + duration + 0.02);
    oscB.stop(now + startOffset + duration + 0.02);
  };

  scheduleTone(0, 0.45);
  scheduleTone(0.62, 0.45);
  return 'playing';
}

export function stopRingAudio(): void {
  if (sharedAudioCtx && sharedAudioCtx.state !== 'closed') {
    void sharedAudioCtx.close().catch(() => undefined);
    sharedAudioCtx = null;
  }
}
