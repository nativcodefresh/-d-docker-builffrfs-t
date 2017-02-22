// main script of the building of the file.

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------
const Promise       = require('bluebird');

const chalk = require('chalk');
const Docker = require('dockerode');
const CFError = require('cf-errors');
const { pack } = require('./packer');

Promise.promisifyAll(Docker.prototype);

const { printResponse } = require('./printer');

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------


exports.main = ({ imageId, dockerFile, buildArgs, labels }) => {
    const docker = Docker();

    pack('./', '.dockerignore')
        .then((tarArchive) => {
            return docker.buildImageAsync(tarArchive, {
                't': imageId,
                'dockerfile': dockerFile,
                'buildargs': buildArgs,
                'labels': labels,
                'pull': true,
                'forcerm': true
            })
                .catch((err) => {
                    const jsonString = err.message.substring(err.message.indexOf('{'));
                    throw new CFError(JSON.parse(jsonString).message);
                });
        })
        .then(printResponse)
        .catch((err) => {
            process.stdout.write(`${chalk.red.bold(err.message)}\n`);
            process.exit(1);
        })
        .done();
};
