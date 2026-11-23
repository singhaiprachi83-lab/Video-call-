/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { PaymentCodePage } from './components/PaymentCodePage';
import { SanskurtiLoader } from './components/SanskurtiLoader';
import { VideoCallRoom } from './components/VideoCallRoom';

type AppStep =
  | { view: 'access'; initialRoomCode?: string }
  | { view: 'room'; roomCode: string; sessionToken: string };

function readInitialRoomCode(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get('room')?.trim() || undefined;
}

export default function App() {
  const [step, setStep] = useState<AppStep>(() => ({
    view: 'access',
    initialRoomCode: readInitialRoomCode(),
  }));
  const [isLoading, setIsLoading] = useState(true);
  const [loaderCycleKey, setLoaderCycleKey] = useState(0);

  useEffect(() => {
    const handlePopState = () => {
      const roomParam = readInitialRoomCode();
      setStep({ view: 'access', initialRoomCode: roomParam });
      setLoaderCycleKey((prev) => prev + 1);
      setIsLoading(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLoaderComplete = useCallback(() => {
    setIsLoading(false);
  }, []);

  const replayIntroLoader = useCallback(() => {
    setLoaderCycleKey((prev) => prev + 1);
    setIsLoading(true);
  }, []);

  const handleCodeVerified = useCallback((sessionToken: string, roomCode: string) => {
    setStep({ view: 'room', roomCode, sessionToken });
  }, []);

  const handleLeaveRoom = useCallback(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      window.history.replaceState({}, '', url.toString());
    }
    setStep({ view: 'access' });
  }, []);

  return (
    <>
      {isLoading && (
        <SanskurtiLoader
          key={loaderCycleKey}
          durationMs={4000}
          onComplete={handleLoaderComplete}
        />
      )}

      {!isLoading && step.view === 'access' && (
        <PaymentCodePage
          initialRoomCode={step.initialRoomCode}
          onVerified={handleCodeVerified}
          onReplayLoader={replayIntroLoader}
        />
      )}

      {!isLoading && step.view === 'room' && (
        <VideoCallRoom
          roomCode={step.roomCode}
          sessionToken={step.sessionToken}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </>
  );
}
