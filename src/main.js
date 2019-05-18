// main script of the building of the file.

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------
const Promise = require('bluebird');
const chalk = require('chalk');
const fs = require('fs');

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
    target: simpleOption('target')
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
            var args;
            if (process.env.LOCAL_TCP_DAEMON) {
                let tcpDaemon = JSON.parse(process.env.LOCAL_TCP_DAEMON);
                
                fs.mkdirSync('/certs');
                fs.writeFileSync('/certs/ca.pem', tcpDaemon.ca);
                fs.writeFileSync('/certs/cert.pem', tcpDaemon.cert);
                fs.writeFileSync('/certs/key.pem', tcpDaemon.key);

                fs.appendFileSync('/etc/hosts', `${tcpDaemon.internalIp} ${tcpDaemon.internalHostname}\n`, function (err) {
                    if (err) throw err;
                });
                var dockerHostOpts = ['-H', `tcp://${tcpDaemon.internalHostname}:${tcpDaemon.port}`,
                    '--tlsverify',
                    '--tlscacert=/certs/ca.pem',
                    '--tlscert=/certs/cert.pem',
                    '--tlskey=/certs/key.pem'
                ];
                args = dockerHostOpts.concat('build', options, '.');
            } else {
                args = ['build'].concat(options, '.');
            }

            const child = spawn(command, args, {
                stdio: ['ignore', 'inherit', 'pipe']
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
