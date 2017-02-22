// index file

'use strict';

const { main } = require('./src/main.js');

main({
    imageId: process.env.IMAGE_ID,
    dockerFile: process.env.DOCKER_FILE,
    buildArgs: process.env.BUILD_ARGS,
    labels: process.env.LABELS
});
