// packing directory to a tar file. while ignoring by it's ignore file.

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Promise       = require('bluebird');
const path = require('path');
const fs = require('fs');
const Ignore = require('ignore');
const tar = require('tar-fs');

Promise.promisifyAll(fs);

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

function getIgnoreFile(ignoreFilePath) {
    return fs.readFileAsync(ignoreFilePath, 'utf-8')
        .then((content) => {
            return Ignore().add(content);
        })
        .catch((err) => {
            if (err.code !== 'ENOENT') {
                throw err;
            }

            return Ignore();
        });
}

//------------------------------------------------------------------------------
// Public Interface
//------------------------------------------------------------------------------

module.exports.pack = (directoryPath, ignoreFile) => {
    return getIgnoreFile(path.join(directoryPath, ignoreFile))
        .then((ignore) => {
            return tar.pack(directoryPath, { ignore: file => ignore.ignores(file) });
        });
};
