import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  Mic,
  MicOff,
  Phone,
  Video,
  VideoOff,
  Volume2,
} from 'lucide-react';
import {
  stopRingAudio,
  triggerOutgoingRingBurst,
  unlockRingAudio,
} from '../utils/ringAudio';
import { FlyingButterflies } from './FlyingButterflies';

interface VideoCallRoomProps {
  roomCode: string;
  sessionToken: string;
  onLeaveRoom: () => void;
}

// Symmetrical waveform heights matching the glowing equalizer in the calling design
const WAVEFORM_BARS = [
  4, 4, 6, 8, 12, 8, 18, 26, 14, 22, 34, 20, 42, 30, 56, 72, 46, 58, 36, 26,
  18, 28, 16, 12, 8, 6, 4, 4,
];

export function VideoCallRoom({
  sessionToken,
  onLeaveRoom,
}: VideoCallRoomProps) {
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [hasLiveStream, setHasLiveStream] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [ringPulseActive, setRingPulseActive] = useState(true);
  const [callConnected, setCallConnected] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const endedRef = useRef(false);

  const stopLocalMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    setHasLiveStream(false);
  }, []);

  const handleEndCall = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    stopRingAudio();
    stopLocalMedia();
    try {
      await fetch('/api/end-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken }),
      });
    } catch {
      // Proceed cleanly back to entry screen
    }
    onLeaveRoom();
  }, [onLeaveRoom, sessionToken, stopLocalMedia]);

  // Verify session token is active on mount
  useEffect(() => {
    let active = true;
    fetch('/api/verify-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken }),
    })
      .then((res) => {
        if (!res.ok && active) {
          onLeaveRoom();
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [onLeaveRoom, sessionToken]);

  // Clean up server session on tab close
  useEffect(() => {
    const handleUnload = () => {
      if (!endedRef.current && navigator.sendBeacon) {
        endedRef.current = true;
        navigator.sendBeacon('/api/end-call', JSON.stringify({ sessionToken }));
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [sessionToken]);

  // Ring for 5 seconds, then pick up the call and start the room video
  useEffect(() => {
    const connectTimer = window.setTimeout(() => {
      stopRingAudio();
      setCallConnected(true);
    }, 5000);

    return () => {
      window.clearTimeout(connectTimer);
    };
  }, []);

  // Track active video call duration once picked up
  useEffect(() => {
    if (!callConnected) return;
    setCallSeconds(0);
    const timerId = window.setInterval(() => {
      setCallSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [callConnected]);

  // Start playing the remote video as soon as the call picks up
  useEffect(() => {
    if (!callConnected || !remoteVideoRef.current) return;
    const videoEl = remoteVideoRef.current;
    videoEl.currentTime = 0;
    const playPromise = videoEl.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        videoEl.muted = true;
        void videoEl.play().catch(() => undefined);
      });
    }
  }, [callConnected]);

  // Continuous outgoing ring cadence while ringing
  useEffect(() => {
    if (callConnected) {
      stopRingAudio();
      return;
    }

    let cancelled = false;
    let pulseTimerId: number | undefined;

    const runRingCycle = async () => {
      const status = await triggerOutgoingRingBurst();
      if (cancelled) return;
      if (status === 'playing') {
        setAudioBlocked(false);
        setRingPulseActive(true);
        pulseTimerId = window.setTimeout(() => {
          if (!cancelled) setRingPulseActive(false);
        }, 1250);
      } else {
        setAudioBlocked(true);
      }
    };

    void runRingCycle();
    const intervalId = window.setInterval(() => {
      void runRingCycle();
    }, 3200);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      if (pulseTimerId !== undefined) {
        window.clearTimeout(pulseTimerId);
      }
      stopRingAudio();
    };
  }, [callConnected]);

  const handleEnableRingAudio = async () => {
    unlockRingAudio();
    const status = await triggerOutgoingRingBurst();
    if (status === 'playing') {
      setAudioBlocked(false);
      setRingPulseActive(true);
    }
  };

  // Automatically open self camera as soon as the calling screen loads
  useEffect(() => {
    if (!cameraOn) {
      stopLocalMedia();
      return;
    }

    let cancelled = false;
    async function openCameraAutomatically() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setHasLiveStream(true);
      } catch {
        // Browser blocked camera permission or no camera present
        if (!cancelled) {
          setHasLiveStream(false);
        }
      }
    }

    void openCameraAutomatically();
    return () => {
      cancelled = true;
      stopLocalMedia();
    };
  }, [cameraOn, stopLocalMedia]);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject =
        cameraOn && hasLiveStream ? streamRef.current : null;
    }
  }, [cameraOn, hasLiveStream]);

  const formattedDuration = `${String(Math.floor(callSeconds / 60)).padStart(2, '0')}:${String(
    callSeconds % 60,
  ).padStart(2, '0')}`;

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col justify-between overflow-hidden bg-[#020203] text-white select-none">
      {/* Flying Butterflies Background Layer while ringing */}
      {!callConnected && <FlyingButterflies />}

      {/* Active Video Call Remote Feed (preloaded while ringing, visible & playing after 5s ring) */}
      <div
        className={`fixed inset-0 z-10 bg-black transition-opacity duration-300 ${
          callConnected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <iframe
  src="https://go.screenpal.com/player/cOXZcTn4HaJ?ff=1&ahc=1&dcc=1&tl=1&bg=transparent&share=1&download=1&embed=1&cl=1"
  title="Sanskurti Video"
  className="h-full w-full border-0"
  allow="autoplay; fullscreen"
  allowFullScreen
/>
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/75 to-transparent"
        />
      </div>

      {/* Top Bar (Back Button + Live Call Header once connected) */}
      <header className="relative z-30 mx-auto flex w-full max-w-md items-center justify-between px-4 pt-5 sm:max-w-xl sm:px-6 sm:pt-7">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleEndCall}
            aria-label="Go back and end call"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 cursor-pointer"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>

          {callConnected && (
            <div className="flex flex-col">
              <span className="flex items-center gap-1.5 text-base font-semibold leading-tight text-white">
                <span>Sanskruti</span>
                <span aria-hidden="true" className="text-sm leading-none text-[#EF1D26]">
                  ❤️
                </span>
              </span>
              <span className="font-mono text-xs tabular-nums text-white/80">
                {formattedDuration}
              </span>
            </div>
          )}
        </div>

        {!callConnected && audioBlocked && (
          <button
            type="button"
            onClick={handleEnableRingAudio}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-md hover:bg-white/20 cursor-pointer"
          >
            <Volume2 className="h-3.5 w-3.5" />
            <span>Tap for Ring Sound</span>
          </button>
        )}
      </header>

      {/* Auto-Opened Floating Self Camera PIP */}
      <div
        className={`fixed right-4 top-5 z-30 h-36 w-24 overflow-hidden rounded-2xl border border-white/25 bg-[#121214] shadow-2xl transition-opacity duration-200 sm:right-6 sm:top-6 sm:h-44 sm:w-32 ${
          cameraOn && hasLiveStream
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full -scale-x-100 object-cover"
        />
      </div>

      {/* Center Portrait + Sanskruti + Calling... + Non-Stop Glowing Waveform (hidden once call picks up) */}
      {!callConnected ? (
        <main className="relative z-20 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 pb-4">
          {/* Circular Profile Portrait with Green Ring & Soft Pulse */}
          <div className="relative flex items-center justify-center">
            <div
              aria-hidden="true"
              className={`absolute h-52 w-52 rounded-full border border-white/25 transition-all duration-1000 sm:h-60 sm:w-60 ${
                ringPulseActive ? 'scale-110 opacity-45' : 'scale-100 opacity-10'
              }`}
            />
            <div className="relative h-44 w-44 overflow-hidden rounded-full border-[3.5px] border-[#43A047] bg-[#0B0F10] shadow-[0_0_32px_rgba(67,160,71,0.22)] sm:h-52 sm:w-52">
              <img
                src="/assets/aistudio/Screenshot_2026-11-23-20-09-44-99_965bbf4d18d205f782c6b8409c5773a4_9114987b.png"
                alt="Sanskruti"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover object-[50%_49.5%] scale-[1.22] -translate-x-[0.5%] brightness-[1.03] contrast-[1.04]"
              />
            </div>
          </div>

          {/* Name + Heart */}
          <h1 className="mt-6 flex items-center justify-center gap-2.5 text-[34px] font-bold tracking-tight text-white sm:text-[38px]">
            <span>Sanskruti</span>
            <span aria-hidden="true" className="text-[30px] leading-none text-[#EF1D26]">
              ❤️
            </span>
          </h1>

          {/* Status: Calling... */}
          <p className="mt-1.5 text-lg font-medium tracking-wide text-white/90">
            Calling...
          </p>

          {/* Non-Stop Glowing Symmetrical Audio Waveform */}
          <div
            aria-hidden="true"
            className="mt-8 flex h-20 w-full max-w-[310px] items-center justify-center gap-[4px] sm:mt-10 sm:max-w-[340px]"
            style={{
              filter: 'drop-shadow(0 0 10px rgba(217, 70, 239, 0.72))',
            }}
          >
            {WAVEFORM_BARS.map((height, idx) => (
              <span
                key={idx}
                className="calling-wave-bar w-[3px] rounded-full bg-white will-change-transform"
                style={{
                  height: `${height}px`,
                  animationDelay: `${(idx % 9) * 0.11}s`,
                  opacity: height <= 6 ? 0.65 : 0.95,
                }}
              />
            ))}
          </div>
        </main>
      ) : (
        <div className="flex-1" />
      )}

      {/* Bottom 3 Circular Calling Controls */}
      <footer className="relative z-30 mx-auto w-full max-w-md px-5 pb-10 pt-4 sm:pb-12">
        <div className="flex items-center justify-center gap-7 sm:gap-9">
          {/* 1. Video Camera Toggle */}
          <button
            type="button"
            onClick={() => setCameraOn((prev) => !prev)}
            aria-label={cameraOn ? 'Turn off video' : 'Turn on video'}
            className={`inline-flex h-16 w-16 items-center justify-center rounded-full transition-colors cursor-pointer sm:h-[68px] sm:w-[68px] ${
              cameraOn
                ? 'bg-[#1D1D1F] text-white hover:bg-[#2A2A2D]'
                : 'bg-white text-[#111113]'
            }`}
          >
            {cameraOn ? (
              <Video className="h-7 w-7 fill-current" />
            ) : (
              <VideoOff className="h-7 w-7" />
            )}
          </button>

          {/* 2. Microphone Toggle */}
          <button
            type="button"
            onClick={() => setMicOn((prev) => !prev)}
            aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
            className={`inline-flex h-16 w-16 items-center justify-center rounded-full transition-colors cursor-pointer sm:h-[68px] sm:w-[68px] ${
              micOn
                ? 'bg-white text-[#111113]'
                : 'bg-[#1D1D1F] text-white hover:bg-[#2A2A2D]'
            }`}
          >
            {micOn ? (
              <Mic className="h-7 w-7" />
            ) : (
              <MicOff className="h-7 w-7" />
            )}
          </button>

          {/* 3. End Call (Red Circle) */}
          <button
            type="button"
            onClick={handleEndCall}
            aria-label="End call"
            className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#FF1F1F] text-white shadow-[0_0_24px_rgba(255,31,31,0.45)] transition-transform hover:bg-[#E01919] active:scale-95 cursor-pointer sm:h-[68px] sm:w-[68px]"
          >
            <Phone className="h-7 w-7 rotate-[135deg] fill-current" />
          </button>
        </div>
      </footer>
    </div>
  );
}
