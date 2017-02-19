FROM node:6.9.2-alpine

VOLUME /code

WORKDIR /app

COPY ./package.json /app/package.json

RUN npm install --production

COPY ./index.js /app/index.js
COPY ./src /app/src

WORKDIR /code

CMD ["node", "/app/index.js"]
