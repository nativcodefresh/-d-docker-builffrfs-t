// packing directory to a tar file. while ignoring by it's ignore file.

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Promise       = require('bluebird');
const path = require('path');
const fs = require('fs');
const minimatch = require('minimatch');
const tar = require('tar-fs');

Promise.promisifyAll(fs);

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

function multiFilter(filters) {
    filters.reverse();

    return (filePath) => {
        const fileSubPaths = filePath.split('/')
            .reduce((acc, val) => {
                const last = acc[acc.length - 1];
                acc.push(last ? `${last}/${val}` : val);
                return acc;
            }, []);

        const lastMatchedFilter = filters
            .find(f => fileSubPaths.some(f));

        if (lastMatchedFilter) {
            return !lastMatchedFilter.isNegate;
        } else {
            return false;
        }

    };
}

function getIgnoreFunction(ignoreFilePath) {
    return fs.readFileAsync(ignoreFilePath, 'utf-8')
        .then((content) => {
            return multiFilter(content.split(/\r?\n/g)
                .map((pattern) => {
                    const filter = minimatch.filter(pattern, {
                        flipNegate: true,
                        nobrace: true,
                        noext: true,
                        dot: true
                    });
                    filter.pattern = pattern;
                    filter.isNegate = pattern[0] === '!';
                    return filter;
                })
            );
        })
        .catch((err) => {
            if (err.code !== 'ENOENT') {
                throw err;
            }

            return () => false;
        });
}

//------------------------------------------------------------------------------
// Public Interface
//------------------------------------------------------------------------------

module.exports.pack = (directoryPath, ignoreFile, unignored = []) => {
    return getIgnoreFunction(path.join(directoryPath, ignoreFile))
        .then((ignoreFunction) => {
            return tar.pack(directoryPath, {
                ignore: file => !unignored.includes(file) && ignoreFunction(file)
            });
        });
};
