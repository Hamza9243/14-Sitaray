import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Plays one character voice line from a local URL and resolves when playback finishes —
 * or after a fallback timeout if the file is missing, fails to load, or never fires
 * `ended` for some reason. Audio is always best-effort here: a failure never throws, so
 * callers (IncomingCallScreen) can always safely continue to the target activity.
 */
export type CharacterAudioState = 'idle' | 'loading' | 'playing' | 'finished' | 'failed';

const MAX_WAIT_MS = 9000;
const FAILURE_GRACE_MS = 2500;

export function useCharacterAudio() {
  const [state, setState] = useState<CharacterAudioState>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resolveRef = useRef<(() => void) | null>(null);
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, []);

  const finish = useCallback(
    (nextState: 'finished' | 'failed') => {
      clearTimers();
      setState(nextState);
      resolveRef.current?.();
      resolveRef.current = null;
    },
    [clearTimers]
  );

  /** Plays `src` and resolves once it finishes (or fails/times out) — never rejects. */
  const play = useCallback(
    (src: string): Promise<void> => {
      return new Promise((resolve) => {
        resolveRef.current = resolve;

        if (typeof Audio === 'undefined' || !src) {
          setState('failed');
          resolve();
          return;
        }

        setState('loading');
        const audio = new Audio(src);
        audioRef.current = audio;

        // Missing/broken files, or ones stuck loading: don't leave the child waiting on a
        // silent "call" forever — bail out to the failed state so the caller moves on.
        const loadGraceTimer = window.setTimeout(() => finish('failed'), FAILURE_GRACE_MS);
        timersRef.current.push(loadGraceTimer);

        audio.addEventListener('ended', () => finish('finished'));
        audio.addEventListener('error', () => finish('failed'));
        audio.addEventListener('playing', () => {
          window.clearTimeout(loadGraceTimer);
          setState('playing');
          // Outer safety cap in case `ended` never fires for some reason.
          timersRef.current.push(window.setTimeout(() => finish('finished'), MAX_WAIT_MS));
        });

        audio.play().catch(() => finish('failed'));
      });
    },
    [finish]
  );

  const stop = useCallback(() => {
    clearTimers();
    audioRef.current?.pause();
    audioRef.current = null;
    resolveRef.current = null;
  }, [clearTimers]);

  useEffect(() => stop, [stop]);

  return { state, play, stop };
}
