// printing a docker build response

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------
const Promise       = require('bluebird');
const CFError = require('cf-errors');
const es = require('event-stream');

//------------------------------------------------------------------------------
// Public Interface
//------------------------------------------------------------------------------

module.exports.printResponse = response => new Promise((resolve, reject) => {
    let done = resolve;
    let lastMessageWasStatus = null;

    response
        .pipe(es.split())
        .pipe(es.parse())
        .pipe(es.map((json, cb) => { // eslint-disable-line array-callback-return
            if (lastMessageWasStatus) {
                process.stdout.write(json.status === lastMessageWasStatus ? '\r' : '\n');
            }

            if (json.stream) {
                process.stdout.write(json.stream, cb);
            } else if (json.status) {
                process.stdout.write(`${json.status} ${json.progress || ''}`, cb);
            } else if (json.error) {
                done = () => reject(new CFError(json.errorDetail.message));
                cb();
            } else if (Object.keys(json).length !== 0 && !json.aux) {
                done = () => reject(new CFError(`Error when parsing the docker api response: ` +
                                                `"${JSON.stringify(json)}"`));
                cb();
            } else {
                cb();
            }

            lastMessageWasStatus = json.status;
        })).on('end', () => {
            process.stdout.write('\n');
            done();
        });
});
