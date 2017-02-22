// TODO: Explain what this file does. (If you see this, blame roy which created this on 19/02/2017)

'use strict';

const { main } = require('./src/main.js');

main({
    imageId: process.env.IMAGE_ID,
    dockerFile: process.env.DOCKER_FILE,
    buildArgs: process.env.BUILD_ARGS,
    labels: process.env.LABELS
});
