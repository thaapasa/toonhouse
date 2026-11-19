# Toonhouse

A tool for making short cartoons. Read [README.md](README.md) for what the app
is and [ARCHITECTURE.md](ARCHITECTURE.md) for how it is built.

[GLOSSARY.md](GLOSSARY.md) lists the terms for the parts of a cartoon and for
the tools. Use those terms in docs, specs, code and UI text.

## Commands

Run these from the repo root. `mise install` sets up the tools and the
dependencies, and `mise clean` removes the dependencies so that you can install
them again.

- `pnpm lint`
- `pnpm format`: formats all files with Prettier, including Markdown.
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

- `pnpm generate-image`, `pnpm render-svg`, `pnpm trace-image` and
  `MISE_ENV=art mise run redraw-image`: make graphics. The last one needs
  `MISE_ENV=art mise install` first. Read [assets/CLAUDE.md](assets/CLAUDE.md)
  before you use them. To make an animated character, follow
  [assets/cutout-toons.md](assets/cutout-toons.md).
- `pnpm font-metrics`: saves the widths of the letters of the bubble fonts for
  the renderer. Run it after changing a font in `assets/fonts/`.

The CI workflow runs the same checks, with `pnpm format:check` instead of
`pnpm format`.

## Local development tasks

`mise start` runs [dekit](https://dekit.run), and `dekit.yaml` lists its tasks.
When you add, rename or remove a server, a check or a project script, update
`dekit.yaml` and the dekit section in `README.md` to match.

dekit has a terminal UI, so don't run `mise start` yourself. Run the commands in
`dekit.yaml` directly.

## Workspace packages

The sandbox and the Mac share the project folder, so each keeps its own
`node_modules` in an airlock cache. When you add a workspace package, add its
`node_modules` to the `node-modules` cache in `airlock.toml`.

## Ports

The app ID is `07`: the server runs on 10700, the Vite dev server on 10710 and
the character studio on 10711. The motion prototypes run on 10790, and the
development database on 10732. Every port comes from an env var with the scheme
port as the default.

## Rules

- Don't limit what users can make. By default everything is allowed: mixing
  asset packs, putting any actor in any scene, a character walking in the sky.
  Add a limit only for a technical reason, and write the reason down. Don't ask
  the user whether to allow something like this. Allow it.
- The renderer packages stay pure: no DOM, no clocks and no randomness. The
  scene at time `t` must depend only on the scene data and `t`.
- Every UI text goes through the translation files, in Finnish and English.
  Don't write UI text in the components.
- Design the editor and the player for touch first. Every control in them must
  work with a finger on an iPad. The character studio needs to work only with a
  mouse.
- Keep the library assets stable, because saved cartoons refer to them. If you
  must rename, remove or restructure a character, a prop, a clip or a
  background, add a new version of the cartoon format and a converter that
  updates the saved cartoons to match. See "Cartoon format versions" in
  [ARCHITECTURE.md](ARCHITECTURE.md).

## Specs

Requirements live in `specs/`, one file per app area. See `specs/README.md` for
the format.

- Read the relevant spec before planning or implementing a feature.
- Add new requirements as unchecked items (`- [ ]`).
- Format the specs with Prettier after editing them: `pnpm format`.
- Tick a requirement (`- [x]`) in the same commit that implements it.
- Ask before changing or removing an existing requirement.
- Each spec can end with an "Open questions" section. Ask the user before you
  implement anything that depends on an open question.

## Design

The UI design is in `design/`, synced from the Claude Design canvas. See
`design/CLAUDE.md` for the boards and the sync steps. To update the local copy,
use the `sync-design` skill.
