ARG NODE_IMAGE=node:20-alpine
FROM ${NODE_IMAGE}

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 7777

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "7777"]
