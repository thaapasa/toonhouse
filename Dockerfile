# Builds the production image. See "Running" in README.md.

# Keep these equal to the node and pnpm versions in mise.toml.
ARG NODE_VERSION=26.13.1
ARG PNPM_VERSION=12.19.0

FROM node:${NODE_VERSION}-slim AS base
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app
# pnpm install needs the manifest of every workspace package to match the
# lockfile, even with a filter.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/
COPY apps/studio/package.json ./apps/studio/
COPY apps/web/package.json ./apps/web/
COPY packages/api/package.json ./packages/api/
COPY packages/model/package.json ./packages/model/
COPY packages/renderer/package.json ./packages/renderer/
COPY packages/stage/package.json ./packages/stage/
COPY prototypes/package.json ./prototypes/

FROM base AS web
RUN pnpm install --frozen-lockfile --filter @toonhouse/web...
COPY tsconfig.base.json ./
COPY assets/fonts ./assets/fonts
COPY assets/packs ./assets/packs
COPY assets/sky ./assets/sky
COPY packages ./packages
COPY apps/web ./apps/web
RUN pnpm --filter @toonhouse/web build

FROM base AS deps
RUN pnpm install --frozen-lockfile --prod --filter @toonhouse/server...

# The server runs its TypeScript through the type stripping of Node, which
# refuses files under node_modules. So the image keeps the workspace layout,
# with the pnpm links from node_modules to packages/.
FROM node:${NODE_VERSION}-slim
ENV NODE_ENV=production \
    SERVER_PORT=3000
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules
COPY package.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/api/src ./packages/api/src
COPY packages/model/package.json ./packages/model/
COPY packages/model/src ./packages/model/src
COPY apps/server/package.json ./apps/server/
COPY apps/server/migrations ./apps/server/migrations
COPY apps/server/src ./apps/server/src
COPY --from=web /app/apps/web/dist ./apps/web/dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://localhost:' + process.env.SERVER_PORT + '/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "apps/server/src/main.ts"]
