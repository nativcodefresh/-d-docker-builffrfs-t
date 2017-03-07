// main script of the building of the file.

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------
const Promise       = require('bluebird');

const Docker = require('dockerode');
const CFError = require('cf-errors');
const { pack } = require('./packer');
const { handleError } = require('./error-handler');

Promise.promisifyAll(Docker.prototype);

const { printResponse } = require('./printer');
const { ProgressReader } = require('./progress-reader');

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------


exports.main = (dockerOptions) => {
    const docker = Docker();

    pack('./', '.dockerignore', ['.dockerignore', dockerOptions.dockerfile || 'Dockerfile'])
        .then((tarArchive) => {
            return docker.buildImageAsync(tarArchive.pipe(new ProgressReader()), dockerOptions)
                .catch((err) => {
                    const jsonString = err.message.substring(err.message.indexOf('{'));
                    throw new CFError(JSON.parse(jsonString).message);
                });
        })
        .then(printResponse)
        .catch(handleError)
        .done();
};
