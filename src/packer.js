// packing directory to a tar file. while ignoring by it's ignore file.

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Promise   = require('bluebird');
const path      = require('path');
const fs        = require('fs');
const minimatch = require('minimatch');
const readdirp  = require('readdirp');
const tarStream = require('tar-stream');
const pump      = require('pump');
const async     = require('async');

Promise.promisifyAll(fs);
Promise.promisifyAll(async);

const readdirpAsync = Promise.promisify(readdirp);
const pumpAsync     = Promise.promisify(pump);

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
        .then(ignoreFunction => [readdirpAsync({
            root: directoryPath,
            fileFilter: ({ path: file }) => {
                return unignored.includes(file) || !ignoreFunction(file);
            }
        }), ignoreFunction])
        .all()
        .then(([result, ignoreFunction]) => {
            const pack = tarStream.pack();

            result.directories.forEach((directory) => {
                if (!ignoreFunction(directory.path)) {
                    pack.entry({
                        name: directory.path,
                        mtime: directory.stat.mtime,
                        mode: directory.stat.mode,
                        uid: directory.stat.uid,
                        gid: directory.stat.gid,
                        type: 'directory',
                        size: 0
                    });
                }
            });

            async.eachSeriesAsync(result.files, (file, done) => {
                const entryStream = pack.entry({
                    name: file.path,
                    mtime: file.stat.mtime,
                    size: file.stat.size,
                    mode: file.stat.mode,
                    uid: file.stat.uid,
                    gid: file.stat.gid,
                    type: 'file'
                });
                const fileStream  = fs.createReadStream(file.fullPath);

                pumpAsync(fileStream, entryStream)
                    .catch((err) => {
                        console.error(err);
                        pack.destroy();
                    })
                    .finally(done);
            })
                .then(() => {
                    pack.finalize();
                })
                .catch((err) => {
                    console.error(err);
                });

            return pack;
        });
};
