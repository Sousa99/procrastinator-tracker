FROM node:24-slim AS build
WORKDIR /app
RUN npm install -g pnpm@11
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter ./frontend build

FROM nginx:alpine
COPY --from=build /app/frontend/dist-app /usr/share/nginx/html
COPY deploy/nginx.spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80