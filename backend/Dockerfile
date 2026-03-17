FROM node:24-alpine

RUN apk update && apk upgrade --no-cache

WORKDIR /app

COPY package*.json ./


RUN npm ci

COPY . .

EXPOSE 3001


CMD ["npm", "start"]
