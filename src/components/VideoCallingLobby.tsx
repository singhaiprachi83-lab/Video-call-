import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CameraOff,
  Check,
  Copy,
  Link2,
  Mic,
  MicOff,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  Video,
} from 'lucide-react';

interface VideoCallingLobbyProps {
  onOpenRoomLink: (roomId: string) => void;
  onReplayLoader: () => void;
  initialRoomCode?: string;
}

function generateRoomCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let partA = '';
  let partB = '';
  for (let i = 0; i < 3; i++) {
    partA += chars[Math.floor(Math.random() * chars.length)];
    partB += chars[Math.floor(Math.random() * chars.length)];
  }
  return `sk-${partA}-${partB}`;
}

export function VideoCallingLobby({
  onOpenRoomLink,
  onReplayLoader,
  initialRoomCode = '',
}: VideoCallingLobbyProps) {
  const [roomInput, setRoomInput] = useState(initialRoomCode || generateRoomCode());
  const [copiedLink, setCopiedLink] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'lobby' | 'rooms' | 'privacy'>('lobby');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const sanitizedRoomCode = roomInput.trim() || 'sk-vip-101';
  const shareableUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(sanitizedRoomCode)}`
      : `?room=${encodeURIComponent(sanitizedRoomCode)}`;

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const toggleCamera = async () => {
    setMediaError(null);
    if (cameraOn) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setCameraOn(false);
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMediaError('Camera preview requires a secure browser context with media device access.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: micOn,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraOn(true);
    } catch {
      setMediaError('Camera permission was not granted. You can still enter any room with audio or lounge backdrop.');
    }
  };

  const toggleMic = () => {
    const nextMic = !micOn;
    setMicOn(nextMic);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = nextMic;
      });
    }
  };

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
    }
  };

  const handleStartNewRoom = () => {
    const freshCode = generateRoomCode();
    setRoomInput(freshCode);
    onOpenRoomLink(freshCode);
  };

  return (
    <div className="min-h-[100dvh] bg-[#080506] text-[#FAF8F9] flex flex-col">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#080506]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-4">
          <button
            type="button"
            onClick={() => setActiveSection('lobby')}
            className="font-display text-2xl font-bold tracking-tight sanskurti-wordmark-gradient whitespace-nowrap shrink-0 cursor-pointer"
          >
            Sanskurti
          </button>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#A49B9F]">
            <button
              type="button"
              onClick={() => setActiveSection('lobby')}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSection === 'lobby' ? 'text-white' : 'hover:text-white'
              }`}
            >
              Lobby
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('rooms')}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSection === 'rooms' ? 'text-white' : 'hover:text-white'
              }`}
            >
              Private Rooms
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('privacy')}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSection === 'privacy' ? 'text-white' : 'hover:text-white'
              }`}
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={onReplayLoader}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Preview 4s Intro
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleStartNewRoom}
              className="inline-flex min-h-[40px] items-center justify-center rounded-full px-5 py-2 text-xs font-semibold tracking-wide text-white sanskurti-bar-gradient shadow-[0_0_20px_rgba(244,38,94,0.28)] transition-transform active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
            >
              Start Call
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:py-14">
        {activeSection === 'lobby' && (
          <>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
              {/* Left Column: Call Initiation & Link Launcher */}
              <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#110B0E] p-6 sm:p-8 lg:col-span-6">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#F0B429]">
                    Private Concierge Video
                  </p>
                  <h2 className="mt-3 font-display text-[32px] font-bold leading-[1.12] tracking-tight text-white text-balance sm:text-[42px]">
                    High-definition calling behind your signature entrance.
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#A49B9F] sm:text-base">
                    Every shared room link opens with the 4-second Sanskurti welcome screen before connecting guests into your private video lounge.
                  </p>

                  {/* Room Link Form */}
                  <div className="mt-7 space-y-4">
                    <div>
                      <label
                        htmlFor="room-code-input"
                        className="block text-xs font-medium text-[#C5BCC0] mb-2"
                      >
                        Room code or invite name
                      </label>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative flex-1">
                          <input
                            id="room-code-input"
                            type="text"
                            value={roomInput}
                            onChange={(e) => setRoomInput(e.target.value)}
                            placeholder="sk-vip-101"
                            className="h-12 w-full rounded-xl border border-white/[0.12] bg-[#080506] px-4 font-mono text-sm text-white placeholder:text-white/30 focus:border-[#F4265E] focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setRoomInput(generateRoomCode())}
                          aria-label="Generate new room code"
                          className="inline-flex h-12 min-w-[44px] items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-[#191115] px-4 text-xs font-medium text-[#E5DEE1] transition-colors hover:border-white/25 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span>New Code</span>
                        </button>
                      </div>
                    </div>

                    {/* Generated Link Preview & Actions */}
                    <div className="rounded-xl border border-white/[0.08] bg-[#080506] p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5 text-xs text-[#A49B9F]">
                          <Link2 className="h-4 w-4 shrink-0 text-[#F0B429]" />
                          <span className="truncate font-mono">{shareableUrl}</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyInvite}
                          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#161013] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-white/25 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {copiedLink ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-[#F0B429]" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => onOpenRoomLink(sanitizedRoomCode)}
                        className="inline-flex h-12 flex-1 items-center justify-center gap-2.5 rounded-xl px-6 text-sm font-semibold text-white sanskurti-bar-gradient shadow-[0_6px_28px_rgba(244,38,94,0.28)] transition-transform active:scale-[0.98] whitespace-nowrap cursor-pointer"
                      >
                        <PhoneCall className="h-4 w-4" />
                        <span>Open Link &amp; Enter Room</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/[0.08] pt-5 text-xs text-[#8E8489]">
                  <span>4s Branded Link Entry</span>
                  <span aria-hidden="true">·</span>
                  <span>1080p Camera Check</span>
                  <span aria-hidden="true">·</span>
                  <span>Encrypted Peer Audio</span>
                </div>
              </div>

              {/* Right Column: Live Camera / Lounge Stage Preview */}
              <div className="relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#110B0E] lg:col-span-6">
                <div className="relative flex-1 min-h-[320px] lg:min-h-0">
                  <img
                    src="/src/assets/images/sanskurti_studio_lounge_1795431211139.jpg"
                    alt="Sanskurti private video lounge interior"
                    referrerPolicy="no-referrer"
                    className={`h-full w-full object-cover transition-opacity duration-300 ${
                      cameraOn ? 'opacity-0' : 'opacity-100'
                    }`}
                  />

                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                      cameraOn ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                  />

                  {/* Subtle gradient scrim for legible overlay controls */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"
                  />

                  {/* Bottom preview controls */}
                  <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 sm:p-6">
                    {mediaError && (
                      <p className="rounded-xl border border-[#F0B429]/30 bg-black/75 px-3.5 py-2 text-xs text-[#F5D076]">
                        {mediaError}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {cameraOn ? 'Live Camera Preview' : 'Studio Lounge Backdrop'}
                        </p>
                        <p className="text-xs text-[#C5BCC0]">
                          {cameraOn ? 'Camera ready' : 'Camera off'} · {micOn ? 'Mic active' : 'Mic muted'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={toggleMic}
                          aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
                          className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors cursor-pointer ${
                            micOn
                              ? 'border-white/20 bg-black/60 text-white hover:bg-black/80'
                              : 'border-[#F4265E]/60 bg-[#F4265E]/20 text-[#FF85A6]'
                          }`}
                        >
                          {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={toggleCamera}
                          aria-label={cameraOn ? 'Turn off camera' : 'Turn on camera'}
                          className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                            cameraOn
                              ? 'border-white/25 bg-black/65 text-white hover:bg-black/85'
                              : 'border-[#D49226]/55 bg-[#191007]/85 text-[#F0B429] hover:border-[#F0B429]'
                          }`}
                        >
                          {cameraOn ? (
                            <>
                              <CameraOff className="h-4 w-4" />
                              <span>Stop Preview</span>
                            </>
                          ) : (
                            <>
                              <Camera className="h-4 w-4" />
                              <span>Test Camera</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Full-Width 4-Column Specification Strip below Hero Split */}
            <section
              aria-label="Platform capabilities"
              className="mt-8 grid grid-cols-1 divide-y divide-white/[0.08] rounded-2xl border border-white/[0.08] bg-[#110B0E] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4"
            >
              <div className="p-6">
                <p className="font-mono text-lg font-medium tabular-nums text-white">4.0s</p>
                <p className="mt-1 text-sm font-medium text-[#E5DEE1]">Branded Link Intro</p>
                <p className="mt-1 text-xs leading-relaxed text-[#8E8489]">
                  Every shared URL plays the exact Sanskurti loading screen first.
                </p>
              </div>
              <div className="p-6">
                <p className="font-mono text-lg font-medium tabular-nums text-white">1080p HD</p>
                <p className="mt-1 text-sm font-medium text-[#E5DEE1]">Adaptive Video Stream</p>
                <p className="mt-1 text-xs leading-relaxed text-[#8E8489]">
                  Crisp portrait framing with local hardware check before joining.
                </p>
              </div>
              <div className="p-6">
                <p className="font-mono text-lg font-medium tabular-nums text-white">1-Click</p>
                <p className="mt-1 text-sm font-medium text-[#E5DEE1]">Direct Room Links</p>
                <p className="mt-1 text-xs leading-relaxed text-[#8E8489]">
                  Zero account hurdles for invited guests joining via private URL.
                </p>
              </div>
              <div className="p-6">
                <p className="font-mono text-lg font-medium tabular-nums text-white">E2E</p>
                <p className="mt-1 text-sm font-medium text-[#E5DEE1]">Private Session Layer</p>
                <p className="mt-1 text-xs leading-relaxed text-[#8E8489]">
                  Clean room isolation built step-by-step for private conversations.
                </p>
              </div>
            </section>
          </>
        )}

        {activeSection === 'rooms' && (
          <section className="rounded-2xl border border-white/[0.08] bg-[#110B0E] p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
                  Private Concierge Rooms
                </h2>
                <p className="mt-1 text-sm text-[#A49B9F]">
                  Click any room link below to experience the 4-second Sanskurti loader followed by the call stage.
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartNewRoom}
                className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-xs font-semibold text-white sanskurti-bar-gradient whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Video className="h-4 w-4" />
                <span>Create New Room</span>
              </button>
            </div>

            <div className="mt-6 divide-y divide-white/[0.08]">
              {[
                { code: 'sk-velvet-01', title: 'Executive Concierge Suite', seats: '1-on-1 Private' },
                { code: 'sk-amber-08', title: 'Client Advisory Lounge', seats: 'Up to 4 Guests' },
                { code: 'sk-crimson-14', title: 'Evening VIP Salon', seats: 'Host Moderated' },
              ].map((room) => (
                <div
                  key={room.code}
                  className="flex flex-col justify-between gap-4 py-5 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="text-base font-semibold text-white">{room.title}</p>
                    <p className="mt-1 font-mono text-xs text-[#A49B9F]">
                      ?room={room.code} · {room.seats}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenRoomLink(room.code)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#D49226]/50 bg-[#191007]/80 px-5 text-xs font-semibold text-[#F0B429] transition-colors hover:border-[#F0B429] hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Open Room Link</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeSection === 'privacy' && (
          <section className="rounded-2xl border border-white/[0.08] bg-[#110B0E] p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#D49226]/40 bg-[#191007] text-[#F0B429]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
                  Media Permissions &amp; Link Privacy
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#A49B9F]">
                  Camera and microphone streams stay directly inside your browser session until you join a call. Room links do not expose personal contact details in the URL—only a short session code.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveSection('lobby')}
                    className="inline-flex h-11 items-center rounded-xl border border-white/[0.12] bg-[#080506] px-5 text-xs font-medium text-white hover:border-white/25 cursor-pointer"
                  >
                    Return to Lobby
                  </button>
                  <button
                    type="button"
                    onClick={onReplayLoader}
                    className="inline-flex h-11 items-center rounded-xl px-5 text-xs font-semibold text-white sanskurti-bar-gradient cursor-pointer"
                  >
                    Replay 4s Loading Page
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-white/[0.08] px-6 py-5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-xs text-[#8E8489] sm:flex-row">
          <p>Sanskurti · Exclusive Private Video Calling</p>
          <p>Step 1 Complete — 4-Second Branded Entry &amp; Room Lobby Ready</p>
        </div>
      </footer>
    </div>
  );
}
