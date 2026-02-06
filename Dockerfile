FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --production

COPY server/ ./server/
COPY scripts/ ./scripts/

EXPOSE 3000

CMD ["node", "server/index.js"]
