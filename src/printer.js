// printing a docker build response

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------
const Promise       = require('bluebird');
// const _       = require('lodash');
const CFError = require('cf-errors');
// const logger  = require('cf-logs').newLoggerFromFilename(__filename);

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

//------------------------------------------------------------------------------
// Public Interface
//------------------------------------------------------------------------------

module.exports.printResponse = response => new Promise((resolve, reject) => {
    let done = resolve;
    let lastMessageWasStatus = null;

    response.on('data', (data) => {
        const json = JSON.parse(data.toString());

        if (lastMessageWasStatus) {
            process.stdout.write(json.status === lastMessageWasStatus ? '\r' : '\n');
        }

        if (json.stream) {
            process.stdout.write(json.stream);
        } else if (json.status) {
            process.stdout.write(`${json.status} ${json.progress || ''}`);
        } else if (json.error) {
            done = () => reject(new CFError(json.errorDetail.message));
        } else if (Object.keys(json).length !== 0) {
            done = () => reject(new CFError(`Error when parsing the docker api response: "${data}"`));
        }
        lastMessageWasStatus = json.status;
    });

    response.on('end', () => {
        process.stdout.write('\n');
        done();
    });
});
