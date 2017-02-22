// TODO: Explain what this file does. (If you see this, blame roy which created this on 22/02/2017)

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------
// const Q       = require('q');
const _       = require('lodash');
const CFError = require('cf-errors');
// const logger  = require('cf-logs').newLoggerFromFilename(__filename);

const Promise       = require('bluebird');
const path = require('path');
const fs = require('fs');
const ignore = require('ignore');
const tar = require('tar-fs');

Promise.promisifyAll(fs);

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

function getIgnoreFile(ignoreFilePath) {
    return fs.readFileAsync(ignoreFilePath)
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

//------------------------------------------------------------------------------
// Public Interface
//------------------------------------------------------------------------------

module.exports.pack = (directoryPath, ignoreFile) => {
    return getIgnoreFile(path.join(directoryPath, ignoreFile))
        .then((dockerIgnore) => {
            return tar.pack(directoryPath, { ignore: file => dockerIgnore.ignores(file) });
        });
};
