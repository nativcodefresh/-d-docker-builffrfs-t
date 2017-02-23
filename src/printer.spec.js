/* eslint-env mocha */

'use strict';

const chai       = require('chai');
const sinon      = require('sinon');
const sinonChai  = require('sinon-chai');
const EventEmitter = require('events');

const { printResponse } = require('./printer');

const expect = chai.expect;
chai.use(sinonChai);

describe('Response Printer', () => {

    beforeEach(() => {
        process.stdout.write = sinon.stub(process.stdout, 'write');
    });

    const restoreStdoutAnd = (done) => {
        return (...args) => {
            process.stdout.write.restore();
            return done(...args);
        }
    };

    it('should print the data brought to it', (done) => {
        const response = new EventEmitter();

        setImmediate(() => {
            response.emit('data', JSON.stringify({ stream: 'Hello  ' }));
            response.emit('data', JSON.stringify({ stream: 'World!!' }));
            response.emit('end');
        });

        printResponse(response)
            .then(() => {
                expect(process.stdout.write).to.have.been.calledWith('Hello  ');
                expect(process.stdout.write).to.have.been.calledWith('World!!');
            })
            .asCallback(restoreStdoutAnd(done));
    });

    it('should print the data to it in status form', (done) => {
        const response = new EventEmitter();

        setImmediate(() => {
            response.emit('data', JSON.stringify({ stream: 'Hello World' }));
            response.emit('data', JSON.stringify({ status: 'This is status' }));
            response.emit('end');
        });

        printResponse(response)
            .then(() => {
                expect(process.stdout.write).to.have.been.calledWith('This is status\n');
            })
            .asCallback(restoreStdoutAnd(done));
    });

    it('should throw error when an error is send in response', (done) => {
        const response = new EventEmitter();

        setImmediate(() => {
            response.emit('data', JSON.stringify({ stream: 'Hello World' }));
            response.emit('data', JSON.stringify({
                error: 'ERROR',
                errorDetail: { message: 'Test Error Message' }
            }));
            response.emit('end');
        });

        printResponse(response)
            .then(() => {
                throw new Error('No Error was thrown');
            }, (err) => {
                expect(err.toString()).to.contain('Test Error Message');
            })
            .asCallback(restoreStdoutAnd(done));
    });
});
