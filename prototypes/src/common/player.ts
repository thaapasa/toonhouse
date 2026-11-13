import { tr } from './i18n.ts';

export interface PlayerOptions {
  /** Length of the scene in seconds. */
  duration: number;
  /** Frame rate for stepping and for the scrub bar. */
  fps: number;
  /** Draws the scene at time `t`. The picture must depend only on `t`. */
  render(t: number): void;
}

declare global {
  interface Window {
    /** Hooks for the screenshot script. */
    toon?: { duration: number; setTime(t: number): void };
  }
}

/**
 * Plays a scene. The clock only decides which `t` to draw; the scene never sees
 * the time between frames.
 */
export function createPlayer(container: HTMLElement, opts: PlayerOptions) {
  const { duration, fps } = opts;
  const frameCount = Math.round(duration * fps);

  const back = button('⏮', tr('stepBack'));
  const play = button('▶', tr('play'));
  const forward = button('⏭', tr('stepForward'));
  const scrub = document.createElement('input');
  scrub.type = 'range';
  scrub.min = '0';
  scrub.max = String(frameCount);
  scrub.step = '1';
  scrub.setAttribute('aria-label', tr('scrub'));
  const label = document.createElement('span');
  label.className = 'time';
  const home = document.createElement('a');
  home.href = './';
  home.className = 'home';
  home.textContent = '☰';
  home.setAttribute('aria-label', tr('back'));
  container.append(home, back, play, forward, scrub, label);

  let t = 0;
  let playing = false;
  let anchorT = 0;
  let anchorClock = 0;

  const params = new URLSearchParams(location.search);
  const startT = params.get('t');
  if (startT !== null) t = clamp(Number(startT));
  else setPlaying(true);

  function clamp(v: number) {
    return Math.min(Math.max(v, 0), duration);
  }

  function setPlaying(p: boolean) {
    playing = p;
    if (p) {
      if (t >= duration) t = 0;
      anchorT = t;
      anchorClock = performance.now();
    }
    play.textContent = p ? '⏸' : '▶';
    play.setAttribute('aria-label', tr(p ? 'pause' : 'play'));
  }

  function draw() {
    opts.render(t);
    scrub.value = String(Math.round(t * fps));
    label.textContent = `${t.toFixed(2)} s`;
  }

  function seek(v: number) {
    setPlaying(false);
    t = clamp(v);
    draw();
  }

  function step(dir: number) {
    seek((Math.round(t * fps) + dir) / fps);
  }

  play.addEventListener('click', () => setPlaying(!playing));
  back.addEventListener('click', () => step(-1));
  forward.addEventListener('click', () => step(1));
  scrub.addEventListener('input', () => seek(Number(scrub.value) / fps));
  window.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
      e.preventDefault();
      setPlaying(!playing);
    } else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  });

  function tick(now: number) {
    if (playing) {
      t = anchorT + (now - anchorClock) / 1000;
      if (t >= duration) {
        // Loop the scene.
        anchorT = 0;
        anchorClock = now;
        t = 0;
      }
    }
    draw();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  window.toon = {
    duration,
    setTime(v: number) {
      seek(v);
    },
  };
}

function button(text: string, ariaLabel: string) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  b.setAttribute('aria-label', ariaLabel);
  return b;
}
