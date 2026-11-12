# Toonhouse

A tool for making short cartoons. Read [README.md](README.md) for what the app
is and [ARCHITECTURE.md](ARCHITECTURE.md) for how it is built.

## Commands

Run these from the repo root. `mise install` sets up the tools and the
dependencies.

- `pnpm lint`
- `pnpm format`: formats all files with Prettier, including Markdown.
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

The CI workflow runs the same checks, with `pnpm format:check` instead of
`pnpm format`.

## Ports

The app ID is `07`: the server runs on 10700 and the Vite dev server on 10710.
Every port comes from an env var with the scheme port as the default.

## Rules

- The renderer packages stay pure: no DOM, no clocks and no randomness. The
  scene at time `t` must depend only on the scene data and `t`.
- Every UI text goes through the translation files, in Finnish and English.
  Don't write UI text in the components.
- Design for touch first. Every control must work with a finger on an iPad.

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
