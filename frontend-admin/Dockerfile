FROM node:20-bookworm-slim AS build

WORKDIR /app

ENV npm_config_update_notifier=false \
    npm_config_fund=false

ARG VITE_API_BASE_URL=http://localhost:3000/api/v1
ARG VITE_APP_NAME=VSP Admin

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_APP_NAME=${VITE_APP_NAME}

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
