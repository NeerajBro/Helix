FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY nx.json tsconfig.base.json eslint.config.mjs .nxignore ./
COPY apps/web ./apps/web
COPY packages ./packages

RUN npm ci --legacy-peer-deps

EXPOSE 4200

CMD ["npx", "nx", "serve", "web", "--host", "0.0.0.0", "--port", "4200", "--configuration=docker"]
