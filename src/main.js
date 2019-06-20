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
    networkmode: simpleOption('network'),
    target: simpleOption('target'),
    secrets: listOption('secret'),
    ssh: listOption('ssh'),
    progress: simpleOption('progress'),
};

const ExitCodesErrorMapper = new Map();
// unexpected errors
ExitCodesErrorMapper.set(/502/, 130); // Bad Gateway
ExitCodesErrorMapper.set(/503/, 130); // Service Unavailable
ExitCodesErrorMapper.set(/504/, 130); // Gateway Timeout
ExitCodesErrorMapper.set(/521/, 130); // Web Server Is Down
ExitCodesErrorMapper.set(/522/, 130); // Connection Timed Out
ExitCodesErrorMapper.set(/523/, 130); // Origin is Unreachable
ExitCodesErrorMapper.set(/524/, 130); // A Timeout Occurred

// Network errors
ExitCodesErrorMapper.set(/ECONNRESET/, 130);
ExitCodesErrorMapper.set(/ENOTFOUND/, 130);
ExitCodesErrorMapper.set(/ESOCKETTIMEDOUT/, 130);
ExitCodesErrorMapper.set(/ETIMEDOUT/, 130);
ExitCodesErrorMapper.set(/ECONNREFUSED/, 130);
ExitCodesErrorMapper.set(/EHOSTUNREACH/, 130);
ExitCodesErrorMapper.set(/EPIPE/, 130);
ExitCodesErrorMapper.set(/EAI_AGAIN/, 130);


const command = 'docker';

exports.main = (dockerOptions) => {
    const buildkitEnabled = process.env.ENABLE_BUILDKIT;
    const isBuildkitEnabled = buildkitEnabled || dockerOptions.ssh || dockerOptions.secrets || dockerOptions.progress;

    if (isBuildkitEnabled && process.env.DISABLE_CACHE_ON_BUILDKIT) {
        delete dockerOptions.cachefrom;
    }

    process.stdout.write(JSON.stringify(process.env));

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
                stdio: ['ignore', 'inherit', 'pipe'],
                env: {
                    DOCKER_BUILDKIT: isBuildkitEnabled ? 1 : 0
                }
            });

            child.stderr.pipe(new ChalkSpreader('red', 'bold')).pipe(process.stdout);

            // record the last stderr message for future use of deciding about the exit code
            let lastError;
            child.stderr.on('data', (data) => {
                lastError = data.toString().toLowerCase();
            });

            child.on('exit', (code, signal) => {
                if (code !== null) {
                    let exitCode = code;

                    // try to see if we can derive the exit code according to the last stderr message
                    if (code !== 0) {
                        ExitCodesErrorMapper.forEach((potentialExitCode, key) => {
                            if (key.test(lastError)) {
                                exitCode = potentialExitCode;
                            }
                        });
                    }

                    process.exit(exitCode);
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
