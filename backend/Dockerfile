ARG NODE_IMAGE=node:20-alpine
FROM ${NODE_IMAGE}

WORKDIR /app

RUN apk add --no-cache ca-certificates curl && update-ca-certificates

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 1337

ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]

CMD ["node", "server.js"]
