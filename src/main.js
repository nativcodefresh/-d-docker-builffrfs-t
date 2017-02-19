// TODO: Explain what this file does. (If you see this, blame roy which created this on 19/02/2017)

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------
const Promise       = require('bluebird');

const fs = require('fs');
const ignore = require('ignore');
const Docker = require('dockerode');
const tar = require('tar-fs');
const chalk = require('chalk');

Promise.promisifyAll(fs);
Promise.promisifyAll(Docker.prototype);

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

function getDockerIgnore() {
    return fs.readFileAsync('./.dockerignore')
        .then((content) => {
            return ignore().add(content);
        })
        .catch((err) => {
            if (err.code !== 'ENOENT') {
                throw err;
            }

            return ignore();
        });
}

exports.main = () => {
    const docker = Docker();

    getDockerIgnore()
        .then((dockerIgnore) => {
            return tar.pack('.', { ignore: dockerIgnore.ignores.bind(dockerIgnore) })
        })
        .then((tarArchive) => {
            return docker.buildImageAsync(tarArchive, {});
        })
        .then((response) => {
            response.on('data', (data) => {
                const json = JSON.parse(data.toString());

                if (json.stream) {
                    process.stdout.write(json.stream);
                } else if (json.errorDetail) {
                    process.stdout.write(chalk.red.bold(json.errorDetail.message));
                } else {
                    throw new Error('Error when parsing the docker api response');
                }
            });

            response.on('end', () => {
                process.stdout.write('\n');
            });
        })
        .done();
};
