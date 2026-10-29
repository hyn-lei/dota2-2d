# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM node:24-alpine AS build
WORKDIR /app
COPY package.json index.html ./
COPY scripts/build.mjs scripts/check-static-build.mjs ./scripts/
COPY src/ ./src/
COPY assets/ ./assets/
# Building this static game needs no npm dependencies.
RUN npm run build && npm run check:build

FROM ghcr.io/nginx/nginx-unprivileged:stable-alpine AS runtime
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
