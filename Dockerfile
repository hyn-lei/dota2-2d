# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json index.html ./
COPY scripts/build.mjs scripts/check-static-build.mjs ./scripts/
COPY src/ ./src/
COPY assets/ ./assets/
RUN npm ci && npm run build && npm run check:build && npm prune --omit=dev

FROM node:24-alpine AS runtime
ARG GAME_REVISION=""
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 STATIC_ROOT=/app/dist GAME_REVISION=${GAME_REVISION}
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules/ ./node_modules/
COPY --from=build /app/dist/ ./dist/
COPY --from=build /app/src/ ./src/
COPY server/ ./server/
COPY scripts/server.mjs ./scripts/server.mjs
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
CMD ["node", "scripts/server.mjs"]
