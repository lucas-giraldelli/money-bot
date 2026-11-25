FROM node:20-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates tzdata python3 make g++  \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc* ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN chown node:node /app
USER node

ENV NODE_ENV=production TZ=America/Manaus
CMD ["./node_modules/.bin/tsx", "src/index.ts"]
