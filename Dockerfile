FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build && npm run build:server

FROM node:20-bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libreoffice curl fonts-dejavu \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/server-dist ./server-dist
COPY --from=build /app/config ./config

RUN mkdir -p /app/data /app/logs /app/cache-office /www/wwwroot /app/config

ENV NODE_ENV=production
ENV MAGUS_DATA_DIR=/app/data
ENV MAGUS_STORAGE_ROOT=/www/wwwroot
ENV NGROK_API_URL=http://ngrok:4040

EXPOSE 3000

CMD ["node", "server-dist/index.js"]
