// index file

'use strict';

const { main } = require('./src/main.js');

main(JSON.parse(process.env.DOCKER_OPTIONS));
