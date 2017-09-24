'use strict';

const Promise = require('bluebird');
const chalk = require('chalk');

const DOCKER_HUB_REGISTRY_URL = 'https://index.docker.io/v1/';

const command = 'docker';

const { spawn } = require('child_process');

exports.registryConfigOption = (registries) => {
    return Promise.all(Object.keys(registries))
        .each((domain) => {
            const credentials = registries[domain];

            let args;
            if (domain === DOCKER_HUB_REGISTRY_URL) {
                args = ['login', '-u', credentials.username, '-p', credentials.password];
            } else {
                args = ['login', domain, '-u', credentials.username, '-p', credentials.password];
            }

            return new Promise((resolve) => {
                const child = spawn(command, args, { stdio: 'ignore' });

                child.on('exit', (code) => {
                    if (code !== 0) {
                        process.stdout.write(chalk.bold.yellow(`problem connecting to '${domain}'\n`));
                    }
                    resolve();
                });
            });
        })
        .return([]);
};
