import { useEffect, useMemo, useState } from 'react';

export interface AudioPlayerOptions {
  downloadFirst?: boolean;
}

export interface AudioStatus {
  playing: boolean;
  currentTime: number;
  duration: number;
  didJustFinish: boolean;
  isLoaded: boolean;
}

export interface AudioPlayer {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
}

/**
 * Drop-in replacement for expo-audio's `useAudioPlayer`/`useAudioPlayerStatus`, aliased
 * in vite.config.ts — backed by a plain HTML5 <audio> element (the browser handles
 * caching/buffering itself, so `downloadFirst` is accepted for API compatibility but
 * unnecessary here). Only the subset DuaAudioPlayer.tsx actually calls is implemented.
 */
export function useAudioPlayer(source: string | null, _options?: AudioPlayerOptions): AudioPlayer & { element: HTMLAudioElement | null } {
  const element = useMemo(() => {
    if (!source || typeof Audio === 'undefined') return null;
    const audio = new Audio(source);
    audio.preload = 'auto';
    return audio;
  }, [source]);

  useEffect(() => {
    return () => {
      element?.pause();
    };
  }, [element]);

  return useMemo(
    () => ({
      element,
      play: () => {
        element?.play().catch(() => {});
      },
      pause: () => element?.pause(),
      seekTo: (seconds: number) => {
        if (element) element.currentTime = seconds;
      },
    }),
    [element]
  );
}

export function useAudioPlayerStatus(player: AudioPlayer & { element: HTMLAudioElement | null }): AudioStatus {
  const { element } = player;
  const [status, setStatus] = useState<AudioStatus>({
    playing: false,
    currentTime: 0,
    duration: 0,
    didJustFinish: false,
    isLoaded: false,
  });

  useEffect(() => {
    if (!element) {
      setStatus({ playing: false, currentTime: 0, duration: 0, didJustFinish: false, isLoaded: false });
      return undefined;
    }

    function update(didJustFinish = false) {
      setStatus({
        playing: !element!.paused && !element!.ended,
        currentTime: element!.currentTime || 0,
        duration: Number.isFinite(element!.duration) ? element!.duration : 0,
        didJustFinish,
        isLoaded: element!.readyState > 0,
      });
    }

    const onUpdate = () => update();
    const onEnded = () => update(true);
    const events: (keyof HTMLMediaElementEventMap)[] = ['play', 'pause', 'timeupdate', 'loadedmetadata', 'durationchange'];
    events.forEach((event) => element.addEventListener(event, onUpdate));
    element.addEventListener('ended', onEnded);
    update();

    return () => {
      events.forEach((event) => element.removeEventListener(event, onUpdate));
      element.removeEventListener('ended', onEnded);
    };
  }, [element]);

  return status;
}
