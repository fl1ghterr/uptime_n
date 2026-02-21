FROM node:20-alpine AS base

RUN apk add --no-cache \
    chromium \
    ca-certificates \
    ttf-freefont \
    tzdata \
    dumb-init

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    CHROME_BIN=/usr/bin/chromium-browser \
    NODE_ENV=production \
    PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-gpu

FROM base AS deps

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM base

WORKDIR /app

RUN addgroup -g 1000 -S app && \
    adduser -u 1000 -S app -G app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

RUN mkdir -p /app/data && chown -R app:app /app

USER app

ENV PORT=3000 \
    HOST=0.0.0.0 \
    DB_PATH=/app/data/uptime.db \
    CRON_SCHEDULE="*/1 * * * *"

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["dumb-init", "node", "server/index.js"]
