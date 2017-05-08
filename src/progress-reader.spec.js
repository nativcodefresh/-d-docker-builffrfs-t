/* eslint-env mocha */

'use strict';

const chai       = require('chai');
const sinon      = require('sinon');
const sinonChai  = require('sinon-chai');
const Promise    = require('bluebird');

const { ProgressReader } = require('./progress-reader');

const expect = chai.expect;
chai.use(sinonChai);

describe('Progress Reader', () => {

    let progressReader;

    beforeEach(() => {
        process.stdout.write = sinon.stub(process.stdout, 'write');
        progressReader = new ProgressReader();
    });

    afterEach(() => {
        progressReader.end();
    });

    const restoreStdout = () => {
        process.stdout.write.restore();
    };

    it('should not change the data written to it', (done) => {
        progressReader.on('data', (data) => {
            Promise.resolve()
                .then(() => expect(data.toString()).to.equal('Hello World'))
                .finally(restoreStdout)
                .asCallback(done);
        });

        progressReader.write('Hello World');
    });
});
