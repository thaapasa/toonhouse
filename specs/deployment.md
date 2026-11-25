# Deployment

The app will run at https://piirretyt.pomeranssi.fi, on the pomeranssi.fi server
next to the other services. Like them, it runs as a Docker image from GitHub
Container Registry (GHCR), with the shared PostgreSQL, behind the front Caddy.
The configuration of that server is in its own repo. Nothing is deployed yet.

These are the settings of the deployment that the code depends on.

- [x] The container sets `NODE_ENV=production`. Without it, the session cookie
      is not `Secure`, and a missing `DATABASE_URL` falls back to the
      development database instead of stopping the server.
- [ ] A scheduled job backs up the database of the app, as for bookkeeper on the
      pomeranssi.fi server. The cartoons and their preview images exist only in
      the database, so the backup of the database covers them all. The first
      deploy can go without the backup.
- [x] The image is built on Node 26 and keeps the layout of the workspace, with
      the pnpm links from `node_modules` to `packages/`. The server runs its
      TypeScript files through the type stripping of Node, which refuses files
      under `node_modules`. So a build that copies the packages into
      `node_modules`, such as `pnpm deploy`, fails at startup.
- [ ] The port of the server is not published. Only Caddy reaches it, on the
      network of the containers. The login limit counts the attempts by the last
      address in `X-Forwarded-For`, which only Caddy can be trusted to set.
- [x] The healthcheck of the container calls `/health`, which also checks the
      database. The slim Node images have no `curl`, so the check can use
      `fetch` in `node`.
- [x] The server applies the new migrations when it starts, so a deploy has no
      separate migration step.
- [ ] The server checks the `Origin` of a change against the public URL of the
      app, which it gets from an environment variable, as the cookbook does with
      `PUBLIC_URL`. The `csrf()` middleware of Hono compares the `Origin` to the
      URL of the request, and behind Caddy the server sees that URL as
      `http://`, so the check never matches. Then only `Sec-Fetch-Site` lets a
      change through, and a browser without it, such as Safari before 16.4,
      can't log out or delete a cartoon. Caddy needs no extra settings for this.
