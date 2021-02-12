FROM node:15.8.0-alpine3.10

ENV TZ Europe/Helsinki
WORKDIR /app
COPY package*.json ./
RUN npm i
COPY . ./
RUN npm run build

CMD ["npm", "start"]
