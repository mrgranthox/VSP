FROM node:20-bookworm-slim

WORKDIR /app

ENV npm_config_update_notifier=false \
    npm_config_fund=false

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

EXPOSE 3000 3002

CMD ["npm", "start"]
