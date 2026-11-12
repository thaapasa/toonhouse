# Toonhouse

A tool for making short cartoons. You place ready-made characters, props and
backgrounds on a scene, give the characters actions such as walking, waving and
talking, and play the result as a movie. It is inspired by Cartooners
(Electronic Arts, 1988).

The app is made for touch screens and iPads first. The UI is in Finnish and
English.

The project is at the planning stage. There is no app code yet.

## Art style

[assets/examples/asset-examples.png](assets/examples/asset-examples.png) shows
the look we're aiming for: bright, colorful cartoon characters, animals,
fairytale creatures and props, with bold outlines and a shared palette. It is a
reference for the style, not a final asset.

The graphics are generated with AI on a local Draw Things install, then traced
to SVG. [assets/CLAUDE.md](assets/CLAUDE.md) describes how.

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md): the structure of the project and the main
  design decisions.
- [specs/README.md](specs/README.md): the requirements, one file per app area.

## Local development

The project uses [mise](https://mise.jdx.dev) for its tools. `mise install`
installs Node, pnpm and VTracer, and then the project dependencies.

```sh
mise install
pnpm lint
pnpm format        # format all files, including Markdown
pnpm typecheck
pnpm test
pnpm build
```

### Ports

The local ports follow the `1AARR` scheme. The app ID is `07`.

| Port  | Use                     |
| ----- | ----------------------- |
| 10700 | Server (API and assets) |
| 10710 | Vite dev server         |
| 10711 | Character studio        |

## Asset licenses

The images are generated with Qwen Image 2.1 Turbo. Its license, the Qwen
Research License Agreement, allows non-commercial use only.
