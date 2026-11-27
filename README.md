# Toonhouse

A tool for making short cartoons. You place ready-made characters, props and
backgrounds on a scene, give the characters actions such as walking, waving and
talking, and play the result as a movie. It is inspired by Cartooners
(Electronic Arts, 1988).

The app is made for touch screens and iPads first. The UI is in Finnish and
English.

The project is at an early stage. The character studio, a development tool that
plays the clips of a character, runs. The web app has the login, the list of
cartoons, a first version of the scene editor and the player. Putting shots
together into a cartoon doesn't exist yet, so the player plays the scenes one
after another.

## Art style

The art is simple on purpose: a few large shapes with flat colors and outlines.
Simple art keeps the assets small and makes them easy to animate. Fine detail
looks wrong when a part bends or stretches in a clip.

The library is made of asset packs, each with its own art style. The first pack,
Sunny, has bright colors and bold dark outlines, and
[assets/examples/asset-examples.png](assets/examples/asset-examples.png) was the
reference for it. Later packs can look very different, as long as they stay
simple.

The graphics are generated with AI on a local Draw Things install, then redrawn
as SVG. [assets/CLAUDE.md](assets/CLAUDE.md) describes how.

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md): the structure of the project and the main
  design decisions.
- [GLOSSARY.md](GLOSSARY.md): the terms we use, and what they mean.
- [specs/README.md](specs/README.md): the requirements, one file per app area.

## Local development

The project uses [mise](https://mise.jdx.dev) for its tools. `mise install`
installs Node, pnpm, VTracer and dekit, and then the project dependencies. The
tools for making graphics are in a separate mise environment:
`MISE_ENV=art mise install` installs them.

The server needs PostgreSQL, which runs in Docker. `docker compose up -d` starts
the development database on port 10732. The server tests make a database of
their own, `toonhouse_test`, on the same server.

Run `mise start` to start the local development tasks in
[dekit](https://dekit.run), a process manager with a terminal UI. `dekit.yaml`
lists its tasks. dekit starts the database, the server on
http://localhost:10700, the web app on http://localhost:10710 and the character
studio on http://localhost:10711. The other tasks start only when you ask for
them: the motion prototypes on http://localhost:10790, the checks (lint with
`--fix`, format, typecheck, tests and tests in watch mode), the database
migrations, adding a user and the build.

In the UI, select a task and press `s` to start it, `r` to restart it or `x` to
stop it. Press `q` to quit, and then `d` to leave the tasks running in the
background. A running dekit keeps its own copy of the tasks, so after you edit
`dekit.yaml`, run `dekit reload --yes` to take the changes.

The same commands also run without dekit:

```sh
mise install
mise clean         # remove the dependencies, then mise install again
pnpm lint
pnpm format        # format all files, including Markdown
pnpm typecheck
pnpm test
pnpm build
pnpm web           # the web app on http://localhost:10710, with the API from the server
pnpm studio        # the character studio on http://localhost:10711
pnpm prototypes    # the motion prototypes on http://localhost:10790
docker compose up -d   # the database on port 10732
pnpm server        # the server on http://localhost:10700
pnpm migrate       # apply the database migrations; the server also does it at startup
```

The server reads its settings from the environment, and in development also from
`apps/server/.env`. [apps/server/.env.example](apps/server/.env.example) lists
them. In production, `DATABASE_URL` and `PUBLIC_URL` must be set.

The studio saves files in the repo, so it listens only on `localhost`. To open
it from another device, start it with `STUDIO_HOST=0.0.0.0 pnpm studio`.

### Users and groups

The app can't add users or groups. Add them with these commands:

```sh
pnpm set-user <username> <display name>   # add a user, or give a new password
pnpm set-user --prompt                    # the same, but ask for the details and the password
pnpm group create <group>
pnpm group add <group> <username>
pnpm group remove <group> <username>
pnpm group list
```

`pnpm set-user` generates the password and prints it once. If the user exists,
it gets a new display name and password, and its logins end. With `--sql`, the
command prints an SQL statement to run in the database instead of writing to it.

With `--prompt`, the command asks for the username, the display name and the
password, and shows the password as stars. If you leave the password empty, it
generates one. The `db/set-user` task in dekit runs `pnpm set-user --prompt`. To
type into it in dekit, press `Ctrl-A` to move the focus to its terminal.

### Ports

The local ports follow the `1AARR` scheme. The app ID is `07`.

| Port  | Use                     |
| ----- | ----------------------- |
| 10700 | Server (API and assets) |
| 10710 | Vite dev server         |
| 10711 | Character studio        |
| 10732 | PostgreSQL, development |
| 10790 | Motion prototypes       |

Each port comes from an environment variable, with the port above as the
default: `SERVER_PORT`, `WEB_PORT`, `STUDIO_PORT`, `DB_PORT` and
`PROTOTYPES_PORT`. The Vite dev server reads `SERVER_PORT` too, to send the API
requests to the server.

## Running

The app runs as a single Docker image, `ghcr.io/thaapasa/toonhouse:<version>`,
built for `linux/arm64`. A reverse proxy such as Caddy sits in front of it and
handles TLS. PostgreSQL runs in its own container.

The container needs `DATABASE_URL`, the PostgreSQL connection, such as
`postgres://toonhouse:<password>@db:5432/toonhouse`, and `PUBLIC_URL`, the
public address of the app, such as `https://piirretyt.pomeranssi.fi`. The server
checks the `Origin` of each change against `PUBLIC_URL`, because behind the
proxy it sees its own address as `http://`. The server applies the new
migrations when it starts.

The image sets `NODE_ENV=production` and `SERVER_PORT=3000`, and runs as user
`node` (UID 1000). The health check endpoint is `/health`, and it also checks
the database. Don't publish the port of the container. The server limits failed
logins per client address, and takes the address from the last entry of
`X-Forwarded-For`, which only the proxy may set.

To add a user in production, run the commands from "Users and groups" in the
container, for example
`docker exec -it <container> node apps/server/src/cli/set-user.ts <username> "<display name>"`.
The group command is `apps/server/src/cli/group.ts`.

To build the image locally, run `docker build -t toonhouse .`.

### Releases

Run the **Release** workflow from the GitHub Actions tab. Choose the bump level
and optionally add highlights for the release notes. The workflow:

1. Bumps the version in `package.json` on a release branch.
2. Builds the image for `linux/arm64` and pushes it to GHCR with the tags
   `<version>` and `latest`.
3. Merges the release branch into `main`, tags the commit as `v<version>` and
   publishes a GitHub Release.

Versions start from `0.x.x`. Use `minor` for features and `patch` for fixes.

## Asset licenses

The images are generated with Qwen Image 2.1 Turbo. Its license, the Qwen
Research License Agreement, allows non-commercial use only.
