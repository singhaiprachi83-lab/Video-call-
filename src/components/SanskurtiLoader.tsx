import { useEffect, useState } from 'react';

interface SanskurtiLoaderProps {
  durationMs?: number;
  onComplete: () => void;
}

export function SanskurtiLoader({
  durationMs = 4000,
  onComplete,
}: SanskurtiLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    let animationFrameId = 0;
    let exitTimeoutId: number | undefined;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const ratio = Math.min(elapsed / durationMs, 1);
      // Slight ease-out curve on the final 10% while remaining strictly locked to 4000ms
      setProgress(ratio);

      if (ratio < 1) {
        animationFrameId = requestAnimationFrame(tick);
      } else {
        setExiting(true);
        exitTimeoutId = window.setTimeout(() => {
          onComplete();
        }, 280);
      }
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (exitTimeoutId !== undefined) {
        window.clearTimeout(exitTimeoutId);
      }
    };
  }, [durationMs, onComplete]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Sanskurti"
      className={`fixed inset-0 z-50 flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-[#080506] px-6 select-none transition-opacity duration-300 ease-out ${
        exiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Ambient crimson-rose glow matching the reference canvas */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 41%, rgba(212, 24, 78, 0.22) 0%, rgba(124, 14, 46, 0.09) 25%, rgba(42, 6, 18, 0.03) 44%, rgba(8, 5, 6, 0) 66%)',
        }}
      />

      {/* Centered brand lockup stack */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Flame emblem with localized soft rose halo */}
        <div className="relative flex items-center justify-center">
          <div
            aria-hidden="true"
            className="absolute h-28 w-28 rounded-full bg-[#F4265E]/20 blur-2xl"
          />
          <svg
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="relative h-12 w-12 sm:h-[52px] sm:w-[52px] drop-shadow-[0_0_16px_rgba(244,38,94,0.45)]"
          >
            <path
              d="M22.2 6.8C22.2 6.8 28.4 12.6 28.4 18.4C28.4 20.1 27.9 21.5 27.2 22.6C28.9 21.5 30.2 19.6 30.8 17.3C33.8 20.1 35.6 24.1 35.6 28.2C35.6 35.2 30.3 40.5 24 40.5C17.4 40.5 12.4 35.4 12.4 28.6C12.4 20.5 18.2 12.5 22.2 6.8Z"
              stroke="#F4265E"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M23.7 25.5C23.7 25.5 26.8 28.6 26.8 31.8C26.8 33.8 25.5 35.3 23.7 35.3C21.9 35.3 20.6 33.8 20.6 31.8C20.6 29.3 22.2 27.1 23.7 25.5Z"
              stroke="#F4265E"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* WELCOME TO */}
        <p className="mt-7 font-display text-[15px] font-normal uppercase tracking-[0.42em] pl-[0.42em] text-[#A49B9F] sm:mt-8 sm:text-[17px]">
          Welcome To
        </p>

        {/* Sanskurti Gradient Wordmark */}
        <h1 className="mt-3 font-display text-[54px] font-bold leading-[1.06] tracking-[-0.015em] sanskurti-wordmark-gradient sm:mt-3.5 sm:text-[68px] md:text-[74px]">
          Sanskurti
        </h1>

        {/* EXCLUSIVE SERVICES Capsule */}
        <div
          className="mt-7 inline-flex items-center justify-center rounded-full border border-[#D49226]/55 bg-[#191007]/70 px-7 py-3 shadow-[0_0_24px_rgba(212,146,38,0.12)] sm:mt-8 sm:px-8 sm:py-3.5"
        >
          <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.24em] pl-[0.24em] text-[#F0B429] whitespace-nowrap sm:text-[12px]">
            Exclusive Services
          </span>
        </div>

        {/* 4-Second Loading Progress Bar */}
        <div
          aria-hidden="true"
          className="mt-8 h-[3.5px] w-[216px] overflow-hidden rounded-full bg-white/[0.14] sm:mt-9 sm:w-[244px]"
        >
          <div
            className="h-full w-full origin-left rounded-full sanskurti-bar-gradient will-change-transform"
            style={{
              transform: `scaleX(${progress})`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
