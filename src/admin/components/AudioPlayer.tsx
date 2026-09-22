import { useEffect, useRef, useState } from 'react';

import { formatDuration } from '../lib/format';

import { Icon } from './Icon';

const waveformCache = new Map<string, number[]>();

/** Decodes the file and reduces it to a handful of bars. Skipped for big files; failure just hides the waveform. */
async function computeWaveform(url: string, bars = 56): Promise<number[] | null> {
  if (waveformCache.has(url)) return waveformCache.get(url)!;
  try {
    const res = await fetch(url);
    const len = Number(res.headers.get('content-length') ?? 0);
    if (len > 12 * 1024 * 1024) return null;
    const buf = await res.arrayBuffer();
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const audio = await ctx.decodeAudioData(buf);
    void ctx.close();
    const data = audio.getChannelData(0);
    const block = Math.floor(data.length / bars) || 1;
    const peaks: number[] = [];
    for (let i = 0; i < bars; i += 1) {
      let max = 0;
      for (let j = i * block; j < Math.min(data.length, (i + 1) * block); j += Math.ceil(block / 40)) max = Math.max(max, Math.abs(data[j]));
      peaks.push(max);
    }
    const top = Math.max(...peaks) || 1;
    const norm = peaks.map((p) => Math.max(0.08, p / top));
    waveformCache.set(url, norm);
    return norm;
  } catch {
    return null;
  }
}

export function AudioPlayer({ url, duration, compact, waveform = true }: { url: string; duration?: number | null; compact?: boolean; waveform?: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [total, setTotal] = useState<number | null>(duration ?? null);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    setPlaying(false);
    setTime(0);
  }, [url]);

  useEffect(() => {
    if (!waveform || compact || !url) return undefined;
    let cancelled = false;
    computeWaveform(url).then((p) => !cancelled && setPeaks(p));
    return () => {
      cancelled = true;
    };
  }, [url, waveform, compact]);

  const progress = total ? Math.min(1, time / total) : 0;

  return (
    <div className={compact ? 'player player-compact' : 'player'}>
      <audio
        ref={ref}
        src={url}
        preload="none"
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setTotal(e.currentTarget.duration)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onEnded={() => {
          setPlaying(false);
          setTime(0);
        }}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onError={() => setFailed(true)}
      />
      <button
        type="button"
        className="player-btn"
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={(e) => {
          e.stopPropagation();
          const a = ref.current;
          if (!a) return;
          if (playing) a.pause();
          else void a.play().catch(() => setFailed(true));
        }}
      >
        <Icon name={playing ? 'pause' : 'play'} size={compact ? 14 : 18} />
      </button>
      {compact ? null : peaks ? (
        <div
          className="wave"
          role="slider"
          aria-label="Seek"
          aria-valuenow={Math.round(progress * 100)}
          onClick={(e) => {
            const a = ref.current;
            if (!a || !total) return;
            const rect = e.currentTarget.getBoundingClientRect();
            a.currentTime = ((e.clientX - rect.left) / rect.width) * total;
          }}
        >
          {peaks.map((p, i) => (
            <span key={i} className={i / peaks.length <= progress ? 'wave-bar wave-on' : 'wave-bar'} style={{ height: `${Math.round(p * 100)}%` }} />
          ))}
        </div>
      ) : (
        <input
          type="range"
          className="seek"
          min={0}
          max={100}
          value={Math.round(progress * 100)}
          aria-label="Seek"
          onChange={(e) => {
            const a = ref.current;
            if (a && total) a.currentTime = (Number(e.target.value) / 100) * total;
          }}
        />
      )}
      <span className="player-time muted">
        {failed ? 'Cannot play' : `${formatDuration(time)} / ${formatDuration(total)}`}
      </span>
    </div>
  );
}
