FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY sql ./sql

ENV NODE_ENV=production
ENV NODE_OPTIONS=--dns-result-order=ipv4first
EXPOSE 3000

CMD ["node", "src/index.js"]
