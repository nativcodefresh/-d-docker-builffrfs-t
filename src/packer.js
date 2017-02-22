// packing directory to a tar file. while ignoring by it's ignore file.

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

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
