# syntax=docker/dockerfile:1
FROM node:22-slim AS builder
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
RUN npm ci --ignore-scripts

COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN npm run build -w @superlink/shared && npm run build -w @superlink/web

FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
