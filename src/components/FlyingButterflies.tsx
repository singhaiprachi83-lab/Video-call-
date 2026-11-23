import { useId } from 'react';

interface ButterflySpec {
  id: number;
  startX: string;
  startY: string;
  size: number;
  duration: number;
  delay: number;
  flapDuration: number;
  opacity: number;
  variant: 'rose' | 'amber';
  pathIndex: 1 | 2 | 3;
}

const BUTTERFLIES: ButterflySpec[] = [
  { id: 1, startX: '8%', startY: '78%', size: 28, duration: 18, delay: 0, flapDuration: 0.48, opacity: 0.5, variant: 'rose', pathIndex: 1 },
  { id: 2, startX: '22%', startY: '88%', size: 20, duration: 22, delay: -4, flapDuration: 0.42, opacity: 0.38, variant: 'amber', pathIndex: 2 },
  { id: 3, startX: '44%', startY: '82%', size: 24, duration: 20, delay: -9, flapDuration: 0.52, opacity: 0.44, variant: 'rose', pathIndex: 3 },
  { id: 4, startX: '64%', startY: '90%', size: 30, duration: 24, delay: -13, flapDuration: 0.56, opacity: 0.48, variant: 'amber', pathIndex: 1 },
  { id: 5, startX: '82%', startY: '76%', size: 22, duration: 19, delay: -7, flapDuration: 0.44, opacity: 0.4, variant: 'rose', pathIndex: 2 },
  { id: 6, startX: '14%', startY: '48%', size: 18, duration: 21, delay: -11, flapDuration: 0.4, opacity: 0.34, variant: 'amber', pathIndex: 3 },
  { id: 7, startX: '72%', startY: '44%', size: 26, duration: 23, delay: -3, flapDuration: 0.5, opacity: 0.42, variant: 'rose', pathIndex: 1 },
  { id: 8, startX: '52%', startY: '62%', size: 21, duration: 17, delay: -15, flapDuration: 0.46, opacity: 0.36, variant: 'amber', pathIndex: 2 },
  { id: 9, startX: '90%', startY: '56%', size: 24, duration: 25, delay: -18, flapDuration: 0.54, opacity: 0.38, variant: 'rose', pathIndex: 3 },
];

export function FlyingButterflies() {
  const gradPrefix = useId().replace(/:/g, '');

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
    >
      {BUTTERFLIES.map((b) => {
        const gradId = `${gradPrefix}-${b.variant}`;
        const animName = `butterfly-glide-${b.pathIndex}`;
        return (
          <div
            key={b.id}
            className="butterfly-flight-wrap absolute will-change-transform"
            style={{
              left: b.startX,
              top: b.startY,
              width: `${b.size}px`,
              height: `${b.size}px`,
              animation: `${animName} ${b.duration}s linear ${b.delay}s infinite`,
            }}
          >
            <svg
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-full w-full overflow-visible"
              style={{
                opacity: b.opacity,
                filter:
                  b.variant === 'rose'
                    ? 'drop-shadow(0 0 8px rgba(244, 38, 94, 0.45))'
                    : 'drop-shadow(0 0 8px rgba(240, 180, 41, 0.4))',
              }}
            >
              <defs>
                <linearGradient id={`${gradId}-l`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop
                    offset="0%"
                    stopColor={b.variant === 'rose' ? '#FF6B9A' : '#FDE047'}
                    stopOpacity="0.95"
                  />
                  <stop
                    offset="100%"
                    stopColor={b.variant === 'rose' ? '#F4265E' : '#F59E0B'}
                    stopOpacity="0.7"
                  />
                </linearGradient>
                <linearGradient id={`${gradId}-r`} x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop
                    offset="0%"
                    stopColor={b.variant === 'rose' ? '#FF6B9A' : '#FDE047'}
                    stopOpacity="0.95"
                  />
                  <stop
                    offset="100%"
                    stopColor={b.variant === 'rose' ? '#F4265E' : '#F59E0B'}
                    stopOpacity="0.7"
                  />
                </linearGradient>
              </defs>

              {/* Left Wing */}
              <g
                className="butterfly-wing-left origin-[32px_32px]"
                style={{
                  animation: `butterfly-flap-left ${b.flapDuration}s ease-in-out infinite alternate`,
                }}
              >
                <path
                  d="M31 30C24 14 8 10 6 22C4 31 15 35 28 33C17 37 12 46 19 52C25 57 31 46 31 35Z"
                  fill={`url(#${gradId}-l)`}
                />
                <path
                  d="M30 29C24 18 12 16 10 23"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                />
              </g>

              {/* Right Wing */}
              <g
                className="butterfly-wing-right origin-[32px_32px]"
                style={{
                  animation: `butterfly-flap-right ${b.flapDuration}s ease-in-out infinite alternate`,
                }}
              >
                <path
                  d="M33 30C40 14 56 10 58 22C60 31 49 35 36 33C47 37 52 46 45 52C39 57 33 46 33 35Z"
                  fill={`url(#${gradId}-r)`}
                />
                <path
                  d="M34 29C40 18 52 16 54 23"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                />
              </g>

              {/* Delicate Body & Antennae */}
              <ellipse cx="32" cy="33" rx="1.6" ry="8.5" fill="rgba(255,255,255,0.85)" />
              <path
                d="M31.5 25C30 20 27 17 25 17M32.5 25C34 20 37 17 39 17"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
            </svg>
          </div>
        );
      })}
    </div>
  );
}
