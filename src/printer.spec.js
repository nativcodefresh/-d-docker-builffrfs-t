/* eslint-env mocha */

'use strict';

const chai       = require('chai');
const sinon      = require('sinon');
const sinonChai  = require('sinon-chai');
const es         = require('event-stream');

const { printResponse } = require('./printer');

const expect = chai.expect;
const { match } = sinon;
chai.use(sinonChai);

describe('Response Printer', () => {

    beforeEach(() => {
        process.stdout.write = sinon.stub(process.stdout, 'write');
        process.stdout.write.withArgs(match.any, match.func).yields();
    });

    const restoreStdout = () => {
        process.stdout.write.restore();
    };

    it('should print the data brought to it', () => {
        const response = es.readArray([
            `${JSON.stringify({ stream: 'Hello  ' })}\n`,
            `${JSON.stringify({ stream: 'World!!' })}`
        ]);

        return printResponse(response)
            .then(() => {
                expect(process.stdout.write).to.have.been.calledWith('Hello  ');
                expect(process.stdout.write).to.have.been.calledWith('World!!');
            })
            .finally(restoreStdout);
    });

    it('should print the data to it in status form', () => {
        const response = es.readArray([
            `${JSON.stringify({ stream: 'Hello  ' })}\n`,
            `${JSON.stringify({ status: 'This is status' })}`
        ]);

        return printResponse(response)
            .then(() => {
                expect(process.stdout.write).to.have.been.calledWith('This is status ');
            })
            .finally(restoreStdout);
    });

    it('should do nothing when getting a empty object', () => {
        const response = es.readArray([
            `${JSON.stringify({})}`
        ]);

        return printResponse(response)
            .then(() => {
                expect(process.stdout.write).to.always.have.been.calledWithExactly('\n');
            })
            .finally(restoreStdout);
    });

    it('should throw error when an error is send in response', () => {
        const response = es.readArray([
            `${JSON.stringify({ stream: 'Hello World' })}\n`,
            `${JSON.stringify({
                error: 'ERROR',
                errorDetail: { message: 'Test Error Message' }
            })}`
        ]);
        return printResponse(response)
            .then(() => {
                throw new Error('No Error was thrown');
            }, (err) => {
                expect(err.toString()).to.contain('Test Error Message');
            })
            .finally(restoreStdout);
    });

    it('should print a \\r between status messages is sent in a row', () => {
        const response = es.readArray([
            `${JSON.stringify({ status: 'Hello World1' })}\n`,
            `${JSON.stringify({ status: 'Hello World1' })}`
        ]);

        return printResponse(response)
            .then(() => {
                expect(process.stdout.write).to.have.been.calledWith('\r');
            })
            .finally(restoreStdout);
    });

    it('should print the progress of the status',  () => {
        const response = es.readArray([
            `${JSON.stringify({ status: 'Hello World', progress: '1' })}\n`,
            `${JSON.stringify({ status: 'Hello World', progress: '2' })}`
        ]);

        return printResponse(response)
            .then(() => {
                expect(process.stdout.write).to.have.been.calledWith('Hello World 1');
                expect(process.stdout.write).to.have.been.calledWith('Hello World 2');
            })
            .finally(restoreStdout);
    });
});
