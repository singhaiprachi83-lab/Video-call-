import {
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Lock,
  MessageCircle,
  PhoneCall,
  RotateCcw,
  ShieldCheck,
  Video,
  Zap,
} from 'lucide-react';
import { unlockRingAudio } from '../utils/ringAudio';
import { FlyingButterflies } from './FlyingButterflies';

interface PaymentCodePageProps {
  initialRoomCode?: string;
  onVerified: (sessionToken: string, roomCode: string) => void;
  onReplayLoader: () => void;
}

const CODE_LENGTH = 6;

const SESSION_HIGHLIGHTS = [
  {
    icon: Video,
    title: 'HD Video Call',
    desc: 'Clear 1-on-1 face-to-face video stream.',
  },
  {
    icon: MessageCircle,
    title: 'Private Chat',
    desc: 'Direct messaging inside your room.',
  },
  {
    icon: Lock,
    title: '6-Digit Access',
    desc: 'Protected by your entry payment code.',
  },
  {
    icon: Zap,
    title: 'Instant Connect',
    desc: 'Opens your private call room immediately.',
  },
] as const;

export function PaymentCodePage({
  initialRoomCode,
  onVerified,
  onReplayLoader,
}: PaymentCodePageProps) {
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<'call' | 'features' | 'how'>('call');
  const [imageError, setImageError] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const fullCode = digits.join('');
  const enteredCount = digits.filter(Boolean).length;
  const isComplete = enteredCount === CODE_LENGTH;

  useEffect(() => {
    const focusTimer = window.setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 150);
    return () => window.clearTimeout(focusTimer);
  }, []);

  const focusInput = (index: number) => {
    const clamped = Math.max(0, Math.min(CODE_LENGTH - 1, index));
    inputRefs.current[clamped]?.focus();
    inputRefs.current[clamped]?.select();
  };

  const handleDigitChange = (index: number, rawValue: string) => {
    const cleaned = rawValue.replace(/\D/g, '');
    setErrorMessage(null);

    if (!cleaned) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }

    if (cleaned.length > 1) {
      const next = [...digits];
      for (let i = 0; i < cleaned.length && index + i < CODE_LENGTH; i++) {
        next[index + i] = cleaned[i];
      }
      setDigits(next);
      focusInput(Math.min(index + cleaned.length, CODE_LENGTH - 1));
      return;
    }

    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);

    if (index < CODE_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits];
        next[index] = '';
        setDigits(next);
        setErrorMessage(null);
      } else if (index > 0) {
        const next = [...digits];
        next[index - 1] = '';
        setDigits(next);
        setErrorMessage(null);
        focusInput(index - 1);
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      e.preventDefault();
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    e.preventDefault();
    const next = Array(CODE_LENGTH).fill('');
    for (let i = 0; i < CODE_LENGTH; i++) {
      next[i] = pasted[i] ?? '';
    }
    setDigits(next);
    setErrorMessage(null);
    focusInput(Math.min(pasted.length, CODE_LENGTH - 1));
  };

  const handleClear = () => {
    setDigits(Array(CODE_LENGTH).fill(''));
    setErrorMessage(null);
    focusInput(0);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(fullCode)) {
      setErrorMessage('Please enter all 6 digits of your entry payment code.');
      const firstEmpty = digits.findIndex((d) => !d);
      focusInput(firstEmpty === -1 ? 0 : firstEmpty);
      return;
    }

    setErrorMessage(null);
    setIsVerifying(true);
    unlockRingAudio();

    try {
      const response = await fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: fullCode }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        message?: string;
        sessionToken?: string;
        roomCode?: string;
      };

      if (!response.ok || !data.ok || !data.sessionToken || !data.roomCode) {
        setErrorMessage(
          data.message || 'Invalid or expired payment code. Please enter a valid 6-digit code.',
        );
        setIsVerifying(false);
        return;
      }

      setIsVerifying(false);
      onVerified(data.sessionToken, data.roomCode);
    } catch {
      setErrorMessage('Unable to connect to the server. Please try again.');
      setIsVerifying(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[#080506] text-[#FAF8F9]">
      {/* Subtle Crimson-Rose Atmospheric Radial Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(circle at 24% 28%, rgba(244, 38, 94, 0.14) 0%, rgba(135, 16, 54, 0.05) 35%, transparent 65%), radial-gradient(circle at 80% 70%, rgba(245, 158, 11, 0.08) 0%, transparent 55%)',
        }}
      />

      {/* Flying Butterflies Background Layer */}
      <FlyingButterflies />

      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#080506]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-5 py-3.5 sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={() => setActiveTab('call')}
            className="font-display text-2xl font-bold tracking-tight sanskurti-wordmark-gradient whitespace-nowrap shrink-0 cursor-pointer"
          >
            Sanskurti
          </button>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#A49B9F]">
            <button
              type="button"
              onClick={() => setActiveTab('call')}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'call' ? 'text-white' : 'hover:text-white'
              }`}
            >
              Video Call
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('features')}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'features' ? 'text-white' : 'hover:text-white'
              }`}
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('how')}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'how' ? 'text-white' : 'hover:text-white'
              }`}
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={onReplayLoader}
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Replay 4s Intro</span>
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('call');
                focusInput(0);
              }}
              className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-[#D49226]/55 bg-[#191007]/80 px-5 py-2 text-xs font-semibold tracking-wide text-[#F0B429] transition-colors hover:border-[#F0B429] hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              Enter Code
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-5 py-6 sm:px-6 sm:py-10">
        {activeTab === 'call' && (
          <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch lg:gap-8">
            {/* Portrait Card (Top on mobile, Left column on desktop) */}
            <section className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-gradient-to-b from-[#1A0A12] to-[#0B0608] shadow-[0_24px_60px_rgba(0,0,0,0.65)] lg:col-span-5">
              <div className="relative aspect-[3/4] w-full sm:aspect-[4/5] lg:h-full lg:min-h-[540px] lg:aspect-auto">
                {!imageError ? (
                  <img
                    src="/assets/aistudio/file_000000006b7482119332716908647e3c_df5493fe.jpg"
                    alt="Sanskurti private video call host"
                    referrerPolicy="no-referrer"
                    onError={() => setImageError(true)}
                    className="h-full w-full object-cover object-[50%_14%] brightness-[1.03] contrast-[1.05]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-[#240B18] to-[#080506]">
                    <Video className="h-14 w-14 text-[#F4265E]/50" />
                  </div>
                )}

                {/* Warm rim tint + measured bottom contrast scrim for crystal-clear typography */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#080506] via-[#080506]/35 to-transparent"
                />

                {/* Editorial Overlay Caption at Bottom of Portrait */}
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#F0B429]">
                    Video Call Service
                  </p>
                  <h1 className="mt-2 font-display text-[32px] font-bold leading-[1.08] tracking-tight text-white sm:text-[38px]">
                    Sanskurti Video Call
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#D5CDD1]">
                    <span>1-on-1 Live HD</span>
                    <span aria-hidden="true">·</span>
                    <span>Private Room</span>
                    {initialRoomCode ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-[#F0B429]">{initialRoomCode}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            {/* Right Column / Below Portrait on Mobile: Features + Entry Payment Code */}
            <section className="flex flex-col justify-between rounded-3xl border border-white/[0.1] bg-[#110B0E] p-6 sm:p-8 lg:col-span-7">
              <div>
                <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#F0B429]">
                      Private Session Access
                    </p>
                    <h2 className="mt-1.5 font-display text-2xl font-bold text-white sm:text-3xl">
                      Enter Payment Code
                    </h2>
                  </div>
                </div>

                {/* Entry Payment Code Form (Below on mobile & focal anchor on desktop) */}
                <form onSubmit={handleSubmit} className="mt-6">
                  <div className="mb-3 flex items-center justify-between text-xs">
                    <label
                      htmlFor="entry-payment-digit-0"
                      className="font-semibold uppercase tracking-[0.14em] text-[#E5DEE1]"
                    >
                      Entry Payment Code
                    </label>
                    <span className="font-mono tabular-nums text-[#A49B9F]">
                      {enteredCount} / {CODE_LENGTH} digits
                    </span>
                  </div>

                  {/* 6-Digit Numeric Boxes */}
                  <div className="rounded-2xl border border-[#D49226]/45 bg-[#080506] p-3.5 shadow-[0_0_28px_rgba(244,38,94,0.12)] sm:p-4">
                    <div className="grid grid-cols-6 gap-2 sm:gap-3">
                      {digits.map((digit, index) => (
                        <input
                          key={index}
                          id={`entry-payment-digit-${index}`}
                          ref={(el) => {
                            inputRefs.current[index] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          autoComplete={index === 0 ? 'one-time-code' : 'off'}
                          maxLength={6}
                          value={digit}
                          placeholder="•"
                          onChange={(e) => handleDigitChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          onPaste={handlePaste}
                          aria-label={`Entry payment code digit ${index + 1}`}
                          className={`h-14 w-full rounded-xl border bg-[#120B0F] text-center font-mono text-2xl font-bold tabular-nums text-white placeholder:text-white/20 transition-colors focus:outline-none sm:h-16 sm:text-3xl ${
                            errorMessage
                              ? 'border-[#F4265E]'
                              : digit
                                ? 'border-[#F0B429]/75 text-white'
                                : 'border-white/[0.12] focus:border-[#F4265E]'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between px-1 text-xs text-[#9C9297]">
                      <span>Type or paste your 6-digit code</span>
                      {enteredCount > 0 && (
                        <button
                          type="button"
                          onClick={handleClear}
                          className="font-medium text-[#F0B429] hover:text-white transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {errorMessage && (
                    <p
                      role="alert"
                      className="mt-3 text-xs font-medium text-[#FF6B93]"
                    >
                      {errorMessage}
                    </p>
                  )}

                  {/* Primary Call Now CTA */}
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className={`mt-5 inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full px-6 text-base font-bold tracking-wide text-white transition-all active:scale-[0.98] whitespace-nowrap cursor-pointer ${
                      isComplete
                        ? 'sanskurti-bar-gradient shadow-[0_8px_32px_rgba(244,38,94,0.35)]'
                        : 'sanskurti-bar-gradient opacity-90 hover:opacity-100'
                    } disabled:opacity-60`}
                  >
                    <PhoneCall className="h-5 w-5" />
                    <span>{isVerifying ? 'Connecting Video Call...' : 'Call Now'}</span>
                  </button>
                </form>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-4 text-xs text-[#8E8489]">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-[#F0B429]" />
                  <span>Verified 6-Digit Entry</span>
                </span>
                <span>Direct Browser Video &amp; Audio</span>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'features' && (
          <section className="mx-auto w-full max-w-3xl rounded-3xl border border-white/[0.1] bg-[#110B0E] p-6 sm:p-10">
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
              Sanskurti Video Call Features
            </h2>
            <p className="mt-2 text-sm text-[#A49B9F]">
              Built for smooth, private 1-on-1 video conversations directly in your browser.
            </p>
            <div className="mt-6 divide-y divide-white/[0.08]">
              {SESSION_HIGHLIGHTS.map((item) => (
                <div key={item.title} className="py-4">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#A49B9F]">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setActiveTab('call')}
                className="inline-flex h-11 items-center rounded-full px-6 text-xs font-semibold text-white sanskurti-bar-gradient cursor-pointer"
              >
                Back to Call Entry
              </button>
            </div>
          </section>
        )}

        {activeTab === 'how' && (
          <section className="mx-auto w-full max-w-3xl rounded-3xl border border-white/[0.1] bg-[#110B0E] p-6 sm:p-10">
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
              How Entry Payment Code Works
            </h2>
            <div className="mt-6 divide-y divide-white/[0.08]">
              <div className="py-4">
                <p className="text-sm font-semibold text-white">01. Open Any Link</p>
                <p className="mt-1 text-xs leading-relaxed text-[#A49B9F]">
                  Every shared link opens with the 4-second Sanskurti welcome loader first.
                </p>
              </div>
              <div className="py-4">
                <p className="text-sm font-semibold text-white">02. Enter 6-Digit Payment Code</p>
                <p className="mt-1 text-xs leading-relaxed text-[#A49B9F]">
                  Enter your 6-digit confirmation code below the host preview card.
                </p>
              </div>
              <div className="py-4">
                <p className="text-sm font-semibold text-white">03. Start Your Video Call</p>
                <p className="mt-1 text-xs leading-relaxed text-[#A49B9F]">
                  Press Call Now to unlock camera, microphone, and screen-sharing controls inside your room.
                </p>
              </div>
            </div>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setActiveTab('call')}
                className="inline-flex h-11 items-center rounded-full px-6 text-xs font-semibold text-white sanskurti-bar-gradient cursor-pointer"
              >
                Enter Payment Code
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
