// main script of the building of the file.

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------
const Promise = require('bluebird');
const chalk = require('chalk');

const { spawn } = require('child_process');

const { simpleOption, booleanOption, mapOption, listOption } = require('./generic-options');
const { registryConfigOption } = require('./registries');
const { ChalkSpreader } = require('./chalk-spreader');

const availableOptions = {
    registryconfig: registryConfigOption,
    dockerfile: simpleOption('file'),
    t: simpleOption('tag'),
    extrahosts: listOption('add-host'),
    q: booleanOption('quiet'),
    nocache: booleanOption('no-cache'),
    cachefrom: listOption('cache-from'),
    pull: booleanOption('pull'),
    rm: booleanOption('rm'),
    forcerm: booleanOption('force-rm'),
    memory: simpleOption('memory'),
    memswap: simpleOption('memory-swap'),
    cpushares: simpleOption('cpu-shares'),
    cpusetcpus: simpleOption('cpuset-cpus'),
    cpuperiod: simpleOption('cpu-period'),
    cpuquota: simpleOption('cpu-quota'),
    buildargs: mapOption('build-arg'),
    shmsize: simpleOption('shm-size'),
    squash: booleanOption('squash'),
    labels: mapOption('label'),
    networkmode: simpleOption('network')
};

const command = 'docker';

exports.main = (dockerOptions) => {
    const optionsPromises = Object.keys(dockerOptions)
        .map(key => [key, dockerOptions[key]])
        .map(([key, value]) => {
            if (availableOptions[key]) {
                return availableOptions[key](value);
            } else {
                throw new Error(`Unknown option ${key}`);
            }
        });

    Promise.reduce(optionsPromises, (acc, item) => acc.concat(item))
        .then((options) => {
            const args = ['build'].concat(options, '.');

            const child = spawn(command, args, {
                stdio: ['ignore', 'inherit', 'pipe']
            });

            child.stderr.pipe(new ChalkSpreader('red', 'bold')).pipe(process.stdout);

            child.on('exit', (code, signal) => {
                if (code !== null) {
                    process.exit(code);
                } else {
                    process.stdout.write(chalk.red.bold(`Exit due signal ${signal}`));
                    process.exit(1);
                }
            });
        })
        .catch((error) => {
            process.stdout.write(chalk.red.bold(error.stack));
            process.exit(1);
        });
};
