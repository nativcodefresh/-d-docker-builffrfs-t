/* eslint-env mocha */

'use strict';

const chai       = require('chai');
// const proxyquire = require('proxyquire').noCallThru();
const sinon      = require('sinon');
const sinonChai  = require('sinon-chai');
const EventEmitter = require('events');

const { printResponse } = require('./printer');

const expect = chai.expect;
chai.use(sinonChai);

describe('Response Printer', () => {

    beforeEach(() => {
        sinon.mock(process.stdout, 'write');
    });

    afterEach(() => {
        process.stdout.write.restore();
    });

    it.only('should print the data brought to it', () => {
        const response = new EventEmitter();

        setImmediate(() => {
            response.emit('data', JSON.stringify({ stream: 'Hello  ' }));
            response.emit('data', JSON.stringify({ stream: 'World!!' }));
            response.emit('end');
        });

        return printResponse(response)
            .then(() => {
                expect(process.stdout.write).to.have.been.calledWith('Hello  ');
                expect(process.stdout.write).to.have.been.calledWith('World!!');
            });
    });

    it('should print the data to it in status form', () => {
        const response = new EventEmitter();

        setImmediate(() => {
            response.emit('data', JSON.stringify({ stream: 'Hello World' }));
            response.emit('data', JSON.stringify({ status: 'This is status' }));
            response.emit('end');
        });

        return printResponse(response)
            .then(() => {
                expect(process.stdout.write).to.have.been.calledWith('This is status\n');
            });
    });

    it('should throw error when an error is send in response', () => {
        const response = new EventEmitter();

        setImmediate(() => {
            response.emit('data', JSON.stringify({ stream: 'Hello World' }));
            response.emit('data', JSON.stringify({
                error: 'ERROR',
                errorDetail: { message: 'Test Error Message' }
            }));
            response.emit('end');
        });

        return printResponse(response)
            .then(() => {
                throw new Error('No Error was thrown');
            }, (err) => {
                expect(err.toString()).to.contain('Test Error Message');
            });
    });
});
