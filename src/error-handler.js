// A function to handle and identify the different errors comes from the docker node.

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------
const chalk = require('chalk');

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

const ExitCodesErrorMapper = new Map();

ExitCodesErrorMapper.set(/Cannot locate specified Dockerfile/ig, 11);
ExitCodesErrorMapper.set(/Unknown instruction/ig, 12);
ExitCodesErrorMapper.set(/The command '.*' returned a non-zero code/ig, 13);



//------------------------------------------------------------------------------
// Public Interface
//------------------------------------------------------------------------------

module.exports.handleError = (err) => {
    let exitCode = 1;
    ExitCodesErrorMapper.forEach((potentialExitCode, key) => {
        if (key.test(err.message)) {
            exitCode = potentialExitCode;
        }
    });

    process.stdout.write(`${chalk.red.bold(err.message)}\n`);
    process.exitCode = exitCode;
};
