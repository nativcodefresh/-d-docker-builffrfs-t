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
                    packingMock(new Set(fs.readdirSync(directoryPath).filter(f => !ignore(f))));
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

    it('should pack all the files when ignore file empty', () => {
        return pack(directory, '.ignore')
            .then(() => {
                expect(packingMock).to.be.calledWith(new Set(['.ignore', 'one.file', 'second.txt', 'another.html']));
            });
    });

    it('should pack all the files when ignore file missing', () => {
        fs.unlinkSync(path.join(directory, '.ignore'));

        return pack(directory, '.ignore')
            .then(() => {
                expect(packingMock).to.be.calledWith(new Set(['one.file', 'second.txt', 'another.html']));
            });
    });

    it('should pack files in sub-directories', () => {
        fs.mkdirSync(path.join(directory, 'empty'));
        fs.mkdirSync(path.join(directory, 'sub-dir'));

        fs.mkdirSync(path.join(directory, 'sub-dir', 'first-sub-sub-dir'));
        fs.writeFileSync(path.join(directory, 'sub-dir', 'first-sub-sub-dir', 'file.txt'));
        fs.writeFileSync(path.join(directory, 'sub-dir', 'first-sub-sub-dir', 'file2.bin'));

        fs.mkdirSync(path.join(directory, 'sub-dir', 'second-2sub-dir'));
        fs.writeFileSync(path.join(directory, 'sub-dir', 'second-2sub-dir', 'other.file'));

        fs.writeFileSync(path.join(directory, 'sub-dir', 'on_root_sub-dir.png'));


        return pack(directory, '.ignore')
            .then(() => {
                expect(packingMock).to.be.calledWith(new Set([
                    'one.file',
                    'second.txt',
                    'another.html',
                    path.join('sub-dir', 'first-sub-sub-dir', 'file.txt'),
                    path.join('sub-dir', 'first-sub-sub-dir', 'file2.bin'),
                    path.join('sub-dir', 'second-2sub-dir', 'other.file'),
                    path.join('sub-dir', 'on_root_sub-dir.png')
                ]));
            });
    });

    it('should pack all files which isn\'t ignore', () => {
        fs.mkdirSync(path.join(directory, 'sub-dir'));

        fs.mkdirSync(path.join(directory, 'sub-dir', 'first-sub-sub-dir'));
        fs.writeFileSync(path.join(directory, 'sub-dir', 'first-sub-sub-dir', 'file.txt'));
        fs.writeFileSync(path.join(directory, 'sub-dir', 'first-sub-sub-dir', 'file2.bin'));
        fs.writeFileSync(path.join(directory, 'sub-dir', 'first-sub-sub-dir', 'file2.bin'));
        fs.writeFileSync(path.join(directory, 'sub-dir', 'first-sub-sub-dir', 'file2.log'));

        fs.mkdirSync(path.join(directory, 'sub-dir', 'second-2sub-dir'));
        fs.writeFileSync(path.join(directory, 'sub-dir', 'second-2sub-dir', 'other.file'));
        fs.writeFileSync(path.join(directory, 'sub-dir', 'second-2sub-dir', 'other.log'));

        fs.writeFileSync(path.join(directory, 'sub-dir', 'on_root_sub-dir.png'));
        fs.writeFileSync(path.join(directory, 'sub-dir', 'another.html'));
        fs.writeFileSync(path.join(directory, 'sub-dir', 'another.log'));

        fs.writeFileSync(path.join(directory, 'file.txt'));

        fs.writeFileSync('.ignore', [
            'sub-dir/second-2sub-dir',
            'file.txt',
            '*.log',
            '/another.html'
        ].join('\n'));


        return pack(directory, '.ignore')
            .then(() => {
                expect(packingMock).to.be.calledWith(new Set([
                    'one.file',
                    'second.txt',
                    path.join('sub-dir', 'first-sub-sub-dir', 'file2.bin'),
                    path.join('sub-dir', 'on_root_sub-dir.png'),
                    path.join('sub-dir', 'another.html')
                ]));
            });
    });

});
