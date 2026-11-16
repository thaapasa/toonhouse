import { useCallback, useEffect, useRef, useState } from 'react';

export interface PlaybackOptions {
  /** Length in seconds. */
  duration: number;
  fps: number;
  /** Start again from the beginning at the end. */
  loop: boolean;
  /** 1 is normal speed. */
  speed: number;
  /** Start playing at once. True if not set. */
  autoplay?: boolean;
  /**
   * How far the user can seek, if past `duration`. Playing from there starts
   * from the beginning.
   */
  seekLimit?: number;
}

export interface Playback {
  /** The time to draw, in seconds. */
  t: number;
  playing: boolean;
  setPlaying(playing: boolean): void;
  /** Pauses and moves to `t`. */
  seek(t: number): void;
  /** Pauses and moves by whole frames. */
  step(frames: number): void;
}

/**
 * Plays from 0 to `duration`. The clock only picks the time `t` to draw; the
 * scene never sees the time between frames.
 */
export function usePlayback({
  duration,
  fps,
  loop,
  speed,
  autoplay = true,
  seekLimit = duration,
}: PlaybackOptions): Playback {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(autoplay);
  const tRef = useRef(0);

  const seek = useCallback(
    (v: number) => {
      setPlaying(false);
      tRef.current = Math.min(Math.max(v, 0), Math.max(duration, seekLimit));
      setT(tRef.current);
    },
    [duration, seekLimit],
  );

  const step = useCallback(
    (frames: number) => seek((Math.round(tRef.current * fps) + frames) / fps),
    [fps, seek],
  );

  useEffect(() => {
    if (!playing) return;
    if (tRef.current >= duration) tRef.current = 0;
    // Playback runs from an anchor: the time `t` at a moment of the clock. A
    // new speed or clip starts a new anchor at the current time.
    let anchor = { t: tRef.current, clock: performance.now() };
    let frame = requestAnimationFrame(function tick(now) {
      let next = anchor.t + ((now - anchor.clock) / 1000) * speed;
      const ended = next >= duration && !loop;
      if (ended) next = duration;
      else if (next >= duration) {
        next %= duration;
        anchor = { t: next, clock: now };
      }
      tRef.current = next;
      setT(next);
      if (ended) setPlaying(false);
      else frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing, duration, loop, speed]);

  return { t, playing, setPlaying, seek, step };
}
