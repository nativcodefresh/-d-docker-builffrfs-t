// TODO: Explain what this file does. (If you see this, blame roy which created this on 21/02/2017)

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

    response.on('data', (data) => {
        const json = JSON.parse(data.toString());

        if (json.stream) {
            process.stdout.write(json.stream);
        } else if (json.status) {
            process.stdout.write(`${json.status}\n`);
        } else if (json.error) {
            done = () => reject(new CFError(json.errorDetail.message));
        } else {
            done = () => reject(new CFError(`Error when parsing the docker api response: "${data}"`));
        }
    });

    response.on('end', () => {
        process.stdout.write('\n');
        done();
    });
});
