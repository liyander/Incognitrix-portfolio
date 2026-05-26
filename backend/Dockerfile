FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 1337

ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]

CMD ["npm", "run", "dev"]
