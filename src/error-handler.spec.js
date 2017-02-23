/* eslint-env mocha */

'use strict';

const chai       = require('chai');
const sinon      = require('sinon');
const sinonChai  = require('sinon-chai');
const CFError    = require('cf-errors');

const { handleError } = require('./error-handler');

const expect = chai.expect;
chai.use(sinonChai);

describe('Error Handler', () => {

    beforeEach(() => {
        process.stdout.write = sinon.stub(process.stdout, 'write');
    });

    afterEach(() => {
        process.stdout.write.restore();
        process.exitCode = 0;
    });

    it('prints the error message', () => {
        const error = new CFError('Error message');

        handleError(error);

        expect(process.stdout.write).to.have.been.calledWithMatch(/Error message/);
    });

    it('exit code is 11 when docker file not found', () => {
        const error = new CFError('Cannot locate specified Dockerfile: dockerfile2');

        handleError(error);

        expect(process.exitCode).to.equal(11);
    });

    it('exit code is 12 when docker file contains unknown instruction', () => {
        const error = new CFError('Unknown instruction: JUMP');

        handleError(error);

        expect(process.exitCode).to.equal(12);
    });

    it('exit code is 13 when instruction failed', () => {
        const error = new CFError('The command \'/bin/sh -c exit 2\' returned a non-zero code: 2');

        handleError(error);

        expect(process.exitCode).to.equal(13);
    });

    it('exit code is 1 when error unknown', () => {
        const error = new CFError('Unknown Error');

        handleError(error);

        expect(process.exitCode).to.equal(1);
    });
});
