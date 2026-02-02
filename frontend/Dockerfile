FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

EXPOSE 3000

CMD ["npm", "start"]
