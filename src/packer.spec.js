/* eslint-env mocha */

'use strict';

const chai       = require('chai');
const proxyquire = require('proxyquire').noCallThru();
const sinon      = require('sinon');
const sinonChai  = require('sinon-chai');
const fs = require('fs');
const rimraf = require('rimraf');
const path = require('path');

const expect = chai.expect;
chai.use(sinonChai);

describe('Packer', () => {

    let pack;
    let directory;
    let packingMock;

    beforeEach(() => {
        packingMock = sinon.mock();
        pack = proxyquire('./packer', {
            'tar-fs': {
                pack: (directoryPath, { ignore }) => {
                    ignore = ignore || (() => {});
                    packingMock(fs.readdirSync(directoryPath).filter(f => !ignore(f)).sort());
                }
            }
        }).pack;

        directory = fs.mkdtempSync('/tmp/cf-docker-builder-');
        fs.writeFileSync(path.join(directory, '.ignore'));
        fs.writeFileSync(path.join(directory, 'one.file'));
        fs.writeFileSync(path.join(directory, 'second.txt'));
        fs.writeFileSync(path.join(directory, 'another.html'));
    });

    afterEach((done) => {
        rimraf(directory, done);
    });

    it('should pack all the files when ignore file empty', (done) => {
        pack(directory, '.ignore')
            .then(() => {
                expect(packingMock).to.be.calledWith(['.ignore', 'one.file', 'second.txt', 'another.html'].sort());
            })
            .asCallback(done);
    });

    it('should pack all the files when ignore file missing', (done) => {
        fs.unlinkSync(path.join(directory, '.ignore'));

        pack(directory, '.ignore')
            .then(() => {
                expect(packingMock).to.be.calledWith(['one.file', 'second.txt', 'another.html'].sort());
            })
            .asCallback(done);
    });

    it('should pack all files which isn\'t ignore', (done) => {
        fs.writeFileSync(path.join(directory, 'other.log'));

        fs.writeFileSync(path.join(directory, 'another.log'));

        fs.writeFileSync(path.join(directory, 'file.txt'));

        fs.writeFileSync(path.join(directory, '.ignore'), [
            'file.txt',
            '*.log',
            '/another.html'
        ].join('\n'));


        pack(directory, '.ignore')
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    '.ignore',
                    'one.file',
                    'second.txt'
                ].sort());
            })
            .asCallback(done);
    });

});
