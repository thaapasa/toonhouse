import type { Clip, ClipId } from '@toonhouse/model';
import type { Playback } from '@toonhouse/stage';

import { useI18n } from '../i18n/index.tsx';
import {
  LoopIcon,
  PauseIcon,
  PlayIcon,
  StepBackIcon,
  StepForwardIcon,
} from './icons.tsx';

export const SPEEDS = [0.25, 0.5, 1, 2] as const;
const TICK_STEPS = [10, 30, 60, 150, 300, 900] as const;

interface Props {
  clips: readonly Clip[];
  clip: Clip;
  fps: number;
  playback: Playback;
  loop: boolean;
  speed: number;
  onClip(id: ClipId): void;
  onLoop(loop: boolean): void;
  onSpeed(speed: number): void;
}

export function ClipBar(props: Props) {
  const { clips, clip, fps, playback, loop, speed } = props;
  const { tr } = useI18n();
  const frames = Math.round(clip.duration * fps);
  const frame = Math.round(playback.t * fps);
  // At most 20 ticks, so that the numbers don't overlap in a long clip.
  const tickStep =
    frames <= 60
      ? 5
      : (TICK_STEPS.find((s) => frames / s <= 20) ?? TICK_STEPS.at(-1)!);
  const ticks: number[] = [];
  for (let f = 0; f <= frames; f += tickStep) ticks.push(f);

  return (
    <section className="clipbar" aria-label={tr('clips')}>
      <div className="clips">
        {clips.map((c) => {
          const on = c.id === clip.id;
          return (
            <button
              key={c.id}
              type="button"
              className="clip"
              aria-pressed={on}
              onClick={() => props.onClip(c.id)}
            >
              {tr(`clip.${c.id}`)}
              <span className="clip-len">
                {tr('frameCount', { n: Math.round(c.duration * fps) })}
              </span>
            </button>
          );
        })}
      </div>

      <div className="transport">
        <button
          type="button"
          className="icon"
          aria-label={tr('stepBack')}
          title={tr('stepBack')}
          onClick={() => playback.step(-1)}
        >
          <StepBackIcon />
        </button>
        <button
          type="button"
          className="icon play"
          aria-label={tr(playback.playing ? 'pause' : 'play')}
          title={tr(playback.playing ? 'pause' : 'play')}
          onClick={() => playback.setPlaying(!playback.playing)}
        >
          {playback.playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          type="button"
          className="icon"
          aria-label={tr('stepForward')}
          title={tr('stepForward')}
          onClick={() => playback.step(1)}
        >
          <StepForwardIcon />
        </button>
        <button
          type="button"
          className="icon toggle"
          aria-pressed={loop}
          aria-label={tr('loop')}
          title={tr('loop')}
          onClick={() => props.onLoop(!loop)}
        >
          <LoopIcon />
        </button>
        <div className="frame-label">
          <strong>{tr('frame', { n: frame })}</strong>
          <span>{tr('frameOf', { n: frames, fps })}</span>
        </div>
        <div className="spacer" />
        <div className="segmented" role="group" aria-label={tr('speed')}>
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={s === speed}
              onClick={() => props.onSpeed(s)}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      <div className="scrub">
        <div className="ticks" aria-hidden="true">
          {ticks.map((f) => (
            <span key={f} style={{ left: `${(f / frames) * 100}%` }}>
              {f}
            </span>
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={frames}
          step={1}
          value={frame}
          aria-label={tr('time')}
          onChange={(e) => playback.seek(Number(e.target.value) / fps)}
        />
      </div>
    </section>
  );
}
