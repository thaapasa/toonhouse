# Work log

Each entry says what was done, with which tool and settings, so that every asset
can be made again. The 2D and 3D prototypes have their own sections. Paths are
relative to the repo root.

## Shared setup

### Tools

- Node 26.13.1 and pnpm 12.19.0 come from `mise install` (see `mise.toml`).
- VTracer 1.0.0-alpha.4 comes from `mise install` (`github:visioncortex/vtracer`
  in `mise.toml`).
- npm packages in `prototypes/`, installed with
  `pnpm add -D vite typescript playwright @types/node @types/three` and
  `pnpm add three`: vite 8.3.8, typescript 6.0.3, playwright 1.65.0, three
  0.187.0, @types/three 0.187.0.
- Headless Chromium for screenshots:
  `pnpm exec playwright install --with-deps chromium` in `prototypes/`. It
  downloaded Chrome Headless Shell 158.0.8127.18 (playwright build 1254) to
  `~/.cache/ms-playwright/`.

### App

- `prototypes/` is one Vite app in the pnpm workspace with `index.html`,
  `2d.html` and `3d.html`.
- `src/common/player.ts` has the controls. The clock only picks which `t` to
  draw. The URL parameter `?t=3.2` opens the page paused at that time.
- `src/common/path.ts` has the walk path and timing that both prototypes use: a
  cubic Bézier on the ground, walked at an even speed with a ramp up and down, a
  stop at 5.2 s and a wave from 5.6 s to 7.4 s.
- `scripts/screenshot.ts` takes screenshots at given times:
  `node scripts/screenshot.ts 2d ../assets/work/shots/2d 0 2.5 6`. It sets the
  time through `window.toon.setTime`.
