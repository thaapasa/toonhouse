// The player plays the cartoon from the start. A tap on the stage pauses and
// plays, and the user can drag the scrubber to any point of the cartoon.
import { Link } from '@tanstack/react-router';
import type { Cartoon } from '@toonhouse/api';
import type { CartoonContent } from '@toonhouse/model';
import {
  cartoonTime,
  type CartoonTimeline,
  cartoonTimeline,
  clamp,
  FPS,
  sceneFrame,
} from '@toonhouse/renderer';
import { usePlayback } from '@toonhouse/stage';
import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
} from 'react';

import {
  BigCloseIcon,
  EditIcon,
  ExitFullscreenIcon,
  FullscreenIcon,
  PauseIcon,
  PlayIcon,
} from '../components/icons.tsx';
import { SceneDrawing } from '../components/SceneDrawing.tsx';
import { useI18n } from '../i18n/index.tsx';
import { LIBRARY } from '../library/index.ts';
import { useFullscreen } from './useFullscreen.ts';

/** How far the arrow keys move on the scrubber, in seconds. */
const KEY_STEP = 5;

/** A time as m:ss. */
function formatTime(t: number) {
  const s = Math.floor(t + 1e-6);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function Player(props: { cartoon: Cartoon; content: CartoonContent }) {
  const { cartoon } = props;
  const { tr } = useI18n();
  const timeline = useMemo(
    () => cartoonTimeline(props.content, LIBRARY),
    [props.content],
  );
  const playback = usePlayback({
    duration: timeline.duration,
    fps: FPS,
    loop: false,
    speed: 1,
    autoplay: timeline.duration > 0,
  });
  const ref = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen(ref);
  const toggle = () => playback.setPlaying(!playback.playing);

  const onKey = useEffectEvent((e: globalThis.KeyboardEvent) => {
    // A focused button handles the space itself.
    if (e.key !== ' ' || e.target instanceof HTMLButtonElement) return;
    if (e.target instanceof HTMLAnchorElement) return;
    e.preventDefault();
    toggle();
  });
  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="player" ref={ref}>
      <header className="player-header">
        {cartoon.canEdit ? (
          <Link
            to="/cartoons/$cartoonId/edit"
            params={{ cartoonId: cartoon.id }}
            className="player-button labeled"
          >
            <EditIcon size={22} />
            {tr('player.edit')}
          </Link>
        ) : (
          <span className="player-header-side" />
        )}
        <h1 className="player-title">{cartoon.title}</h1>
        <Link
          to="/"
          className="player-button"
          aria-label={tr('close')}
          title={tr('close')}
        >
          <BigCloseIcon />
        </Link>
      </header>

      <div className="player-stage-area">
        <PlayerStage timeline={timeline} t={playback.t} onTap={toggle} />
      </div>

      <div className="player-controls">
        <button
          type="button"
          className="player-play"
          aria-label={tr(playback.playing ? 'player.pause' : 'player.play')}
          title={tr(playback.playing ? 'player.pause' : 'player.play')}
          disabled={timeline.duration === 0}
          onClick={toggle}
        >
          {playback.playing ? <PauseIcon size={26} /> : <PlayIcon size={26} />}
        </button>
        <Scrubber
          t={playback.t}
          duration={timeline.duration}
          playing={playback.playing}
          onSeek={playback.seek}
          onPlay={playback.setPlaying}
        />
        <div className="player-time">
          {formatTime(playback.t)} / {formatTime(timeline.duration)}
        </div>
        {fullscreen.supported && (
          <button
            type="button"
            className="player-button small"
            aria-label={tr(
              fullscreen.active ? 'player.exitFullscreen' : 'player.fullscreen',
            )}
            title={tr(
              fullscreen.active ? 'player.exitFullscreen' : 'player.fullscreen',
            )}
            onClick={fullscreen.toggle}
          >
            {fullscreen.active ? <ExitFullscreenIcon /> : <FullscreenIcon />}
          </button>
        )}
      </div>
    </div>
  );
}

function PlayerStage(props: {
  timeline: CartoonTimeline;
  t: number;
  onTap(): void;
}) {
  const { tr } = useI18n();
  const at = cartoonTime(props.timeline, props.t);
  if (!at) {
    return (
      <div className="stage player-stage">
        <span className="stage-ground" />
        <p className="stage-hint">{tr('player.empty')}</p>
      </div>
    );
  }
  const { scene, background: bg } = at.entry;
  const frame = sceneFrame(scene, bg, LIBRARY, at.t);
  return (
    <div className="stage player-stage">
      <svg
        className="stage-svg"
        viewBox={`0 0 ${bg.width} ${bg.height}`}
        onClick={props.onTap}
        aria-label={tr('player.stage')}
      >
        <SceneDrawing
          // Each scene its own symbols, as the actors of two scenes can
          // have the same ids.
          key={scene.id}
          scene={scene}
          frame={frame}
          prefix="player"
        />
      </svg>
    </div>
  );
}

/**
 * The position in the cartoon. Dragging it pauses the playback, and the
 * playback goes on when the finger lifts, if it was playing.
 */
function Scrubber(props: {
  t: number;
  duration: number;
  playing: boolean;
  onSeek(t: number): void;
  onPlay(playing: boolean): void;
}) {
  const { t, duration } = props;
  const { tr } = useI18n();
  const drag = useRef<{ pointer: number; resume: boolean } | null>(null);
  const share = duration > 0 ? Math.min(t / duration, 1) : 0;

  const timeAt = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = clamp((e.clientX - r.left) / r.width, 0, 1);
    return Math.round(x * duration * FPS) / FPS;
  };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current || duration === 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { pointer: e.pointerId, resume: props.playing };
    props.onSeek(timeAt(e));
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointer === e.pointerId) props.onSeek(timeAt(e));
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointer !== e.pointerId) return;
    const { resume } = drag.current;
    drag.current = null;
    if (resume && t < duration) props.onPlay(true);
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const step =
      e.key === 'ArrowRight' ? KEY_STEP : e.key === 'ArrowLeft' ? -KEY_STEP : 0;
    if (e.key === 'Home') props.onSeek(0);
    else if (e.key === 'End') props.onSeek(duration);
    else if (step) props.onSeek(t + step);
    else return;
    e.preventDefault();
  };

  return (
    <div
      className="scrubber"
      role="slider"
      tabIndex={0}
      aria-label={tr('player.position')}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(t)}
      aria-valuetext={`${formatTime(t)} / ${formatTime(duration)}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={key}
    >
      <div className="scrubber-track">
        <div className="scrubber-fill" style={{ width: `${share * 100}%` }} />
        <div className="scrubber-thumb" style={{ left: `${share * 100}%` }} />
      </div>
    </div>
  );
}
