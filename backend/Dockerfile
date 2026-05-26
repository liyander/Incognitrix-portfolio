FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 1337

ENTRYPOINT ["/app/docker-entrypoint.sh"]

CMD ["npm", "run", "dev"]
