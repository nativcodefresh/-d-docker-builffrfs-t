'use strict';

const Promise = require('bluebird');
const chalk = require('chalk');

const command = 'docker';

const { spawn } = require('child_process');

exports.registryConfigOption = (registries) => {
    return Promise.all(Object.keys(registries))
        .each((domain) => {
            const credentials = registries[domain];
            const args = ['login', domain, '-u', credentials.username, '-p', credentials.password];

            return new Promise((resolve) => {
                const child = spawn(command, args, { stdio: 'ignore' });

                child.on('exit', (code, stdout, stderr) => {
                    if (code !== 0) {
                        process.stdout.write(chalk.bold.yellow(`problem connecting to '${domain}': ${stderr}`));
                    }
                    resolve();
                });
            });
        })
        .return([]);
};
