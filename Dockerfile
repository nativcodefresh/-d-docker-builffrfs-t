FROM alpine:3.5

# install node
RUN apk add --no-cache nodejs=6.9.2-r1 tini

# set working directory
WORKDIR /app

# copy project file
COPY package.json .

# Build time argument to set NODE_ENV ('production'' by default)
ARG NODE_ENV
ENV NODE_ENV ${NODE_ENV:-production}

# install node packages
RUN apk add --no-cache --virtual .build-dep git && \
    npm set progress=false && \
    npm config set depth 0 && \
    npm install && \
    npm cache clean && \
    apk del .build-dep && \
    rm -rf /tmp/*

# Set tini as entrypoint
COPY ./index.js /app/index.js
COPY ./src /app/src

VOLUME /code
WORKDIR /code

# Set tini as entrypoint
ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "/app/index.js"]
