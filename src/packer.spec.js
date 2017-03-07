/* eslint-env mocha */

'use strict';

const chai         = require('chai');
const proxyquire   = require('proxyquire').noCallThru();
const sinon        = require('sinon');
const sinonChai    = require('sinon-chai');
const fs           = require('fs');
const rimraf       = require('rimraf');
const find         = require('find');
const path         = require('path');
const { Readable } = require('stream');

const expect = chai.expect;
chai.use(sinonChai);

describe('Packer', () => {

    let pack;
    let directory;
    let packingMock;

    beforeEach(() => {
        packingMock = sinon.mock();
        pack        = proxyquire('./packer', {
            'tar-fs': {
                pack: (directoryPath, { ignore }) => {
                    ignore = ignore || (() => {});
                    packingMock(find.fileSync(directoryPath)
                        .map(f => f.substr(directoryPath.length + 1))
                        .filter(f => !ignore(f)).sort());

                    return new (class extends Readable {
                        constructor() {
                            super({});
                            this.push('Hello World', 'utf-8');
                            this.push(null);
                        }
                    })();
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
                expect(packingMock).to.be
                    .calledWithExactly(['.ignore', 'one.file', 'second.txt', 'another.html'].sort());
            })
            .asCallback(done);
    });

    it('should pack all the files when ignore file missing', (done) => {
        fs.unlinkSync(path.join(directory, '.ignore'));

        pack(directory, '.ignore')
            .then(() => {
                expect(packingMock)
                    .to
                    .be
                    .calledWith(['one.file', 'second.txt', 'another.html'].sort());
            })
            .asCallback(done);
    });

    it('should pack all files which isn\'t ignore', (done) => {
        fs.writeFileSync(path.join(directory, 'other.log'));

        fs.writeFileSync(path.join(directory, 'another.log'));

        fs.writeFileSync(path.join(directory, 'file.txt'));

        fs.writeFileSync(path.join(directory, '.ignore'), [
            'fi??.txt',
            'one',
            '*.log',
            'another.html'
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

    it('should not ignore files when pattern starts with /', (done) => {

        fs.writeFileSync(path.join(directory, '.ignore'), [
            '/another.html'
        ].join('\n'));


        pack(directory, '.ignore')
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    '.ignore',
                    'one.file',
                    'second.txt',
                    'another.html'
                ].sort());
            })
            .asCallback(done);
    });

    it('should pack file in sub-directories', (done) => {
        fs.mkdirSync(path.join(directory, 'sub'));

        fs.writeFileSync(path.join(directory, 'sub', 'file.txt'));

        pack(directory, '.ignore')
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    '.ignore',
                    'one.file',
                    'second.txt',
                    'another.html',
                    'sub/file.txt'
                ].sort());
            })
            .asCallback(done);
    });

    it('should only ignore files on root directory or with path specified from root', (done) => {
        fs.mkdirSync(path.join(directory, 'sub'));

        fs.writeFileSync(path.join(directory, 'sub', 'file.txt'));

        fs.writeFileSync(path.join(directory, '.ignore'), [
            '*.txt'
        ].join('\n'));

        pack(directory, '.ignore')
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    '.ignore',
                    'one.file',
                    'another.html',
                    'sub/file.txt'
                ].sort());
            })
            .asCallback(done);
    });

    it('should only ignore directories on root directory or with path specified from root', (done) => {
        fs.mkdirSync(path.join(directory, 'sub'));
        fs.mkdirSync(path.join(directory, 'dir'));
        fs.mkdirSync(path.join(directory, 'sub', 'dir'));

        fs.writeFileSync(path.join(directory, 'sub', 'dir', 'file.txt'));
        fs.writeFileSync(path.join(directory, 'dir', 'file.txt'));

        fs.writeFileSync(path.join(directory, '.ignore'), [
            'dir'
        ].join('\n'));

        pack(directory, '.ignore')
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    '.ignore',
                    'one.file',
                    'second.txt',
                    'another.html',
                    'sub/dir/file.txt'
                ].sort());
            })
            .asCallback(done);
    });

    it('should ignore every file in pattern if the globstar present', (done) => {

        fs.mkdirSync(path.join(directory, 'sub'));
        fs.writeFileSync(path.join(directory, 'sub', 'some.html'));
        fs.writeFileSync(path.join(directory, 'sub', 'some.bin'));

        fs.mkdirSync(path.join(directory, 'dir'));
        fs.writeFileSync(path.join(directory, 'dir', 'file.txt'));

        fs.mkdirSync(path.join(directory, 'sub', 'dir'));
        fs.writeFileSync(path.join(directory, 'sub', 'dir', 'file2.txt'));

        fs.mkdirSync(path.join(directory, 'sub', 'dir2'));
        fs.writeFileSync(path.join(directory, 'sub', 'dir2', 'a.log'));
        fs.writeFileSync(path.join(directory, 'sub', 'dir2', 'ab.log'));

        fs.writeFileSync(path.join(directory, '.ignore'), [
            '**/dir',
            '**/*.html',
            'sub/**/?.log'
        ].join('\n'));

        pack(directory, '.ignore')
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    '.ignore',
                    'one.file',
                    'second.txt',
                    'sub/dir2/ab.log',
                    'sub/some.bin'
                ].sort());
            })
            .asCallback(done);
    });

    it('should negate ignores', (done) => {

        fs.writeFileSync(path.join(directory, 'ignored.html'));

        fs.writeFileSync(path.join(directory, '.ignore'), [
            '*.html',
            '!a*.html'
        ].join('\n'));

        pack(directory, '.ignore')
            .then(() => {
                expect(packingMock).to.be
                    .calledWithExactly(['.ignore', 'one.file', 'second.txt', 'another.html'].sort());
            })
            .asCallback(done);
    });

    it('should negate ignores by the last pattern match', (done) => {

        fs.writeFileSync(path.join(directory, 'ignored.html'));

        fs.writeFileSync(path.join(directory, '.ignore'), [
            '!ignored.html',
            '*.html'
        ].join('\n'));

        pack(directory, '.ignore')
            .then(() => {
                expect(packingMock).to.be
                    .calledWithExactly(['.ignore', 'one.file', 'second.txt'].sort());
            })
            .asCallback(done);
    });

    it('should allows comment in dockerfile', (done) => {

        fs.writeFileSync(path.join(directory, '.ignore'), [
            '',
            '*.html',
            '',
            '',
            '# comment'
        ].join('\n'));

        pack(directory, '.ignore')
            .then(() => {
                expect(packingMock).to.be
                    .calledWithExactly(['.ignore', 'one.file', 'second.txt'].sort());
            })
            .asCallback(done);
    });

    it('should ignore directory with . when using ** pattern', (done) => {
        fs.mkdirSync(path.join(directory, '.sub'));

        fs.writeFileSync(path.join(directory, '.sub', 'file.txt'));

        fs.writeFileSync(path.join(directory, '.ignore'), [
            '**/file.txt'
        ].join('\n'));

        pack(directory, '.ignore')
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    '.ignore',
                    'one.file',
                    'second.txt',
                    'another.html'
                ].sort());
            })
            .asCallback(done);
    });

    it('should ignore file with . when using * pattern', (done) => {

        fs.writeFileSync(path.join(directory, '.ignore'), [
            '.*'
        ].join('\n'));

        pack(directory, '.ignore')
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    'one.file',
                    'second.txt',
                    'another.html'
                ].sort());
            })
            .asCallback(done);
    });

    it('should ignore file when using [Ii] pattern', (done) => {

        fs.writeFileSync(path.join(directory, '.Ignore'));

        fs.writeFileSync(path.join(directory, '.ignore'), [
            '.[Ii]gnore'
        ].join('\n'));

        pack(directory, '.ignore')
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    'one.file',
                    'second.txt',
                    'another.html'
                ].sort());
            })
            .asCallback(done);
    });

    it('should ignore file when using [a-z] pattern', (done) => {

        fs.writeFileSync(path.join(directory, '.agnore'));
        fs.writeFileSync(path.join(directory, '.tgnore'));
        fs.writeFileSync(path.join(directory, '.xgnore'));

        fs.writeFileSync(path.join(directory, '.ignore'), [
            '.[a-z]gnore'
        ].join('\n'));

        pack(directory, '.ignore')
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    'one.file',
                    'second.txt',
                    'another.html'
                ].sort());
            })
            .asCallback(done);
    });

    it('should ignore file when using [\\\\\\-\\^] pattern', (done) => {

        fs.writeFileSync(path.join(directory, 'go-to'));
        fs.writeFileSync(path.join(directory, 'go_to'));
        fs.writeFileSync(path.join(directory, 'go\\to'));
        fs.writeFileSync(path.join(directory, 'go^to'));

        fs.writeFileSync(path.join(directory, '.ignore'), [
            'go[\\-_\\^\\\\]to'
        ].join('\n'));

        pack(directory, '.ignore')
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    '.ignore',
                    'one.file',
                    'second.txt',
                    'another.html'
                ].sort());
            })
            .asCallback(done);
    });

    it('should ignore file when using [^i] pattern', (done) => {

        fs.writeFileSync(path.join(directory, '.Ignore'));

        fs.writeFileSync(path.join(directory, '.ignore'), [
            '.[^i]gnore'
        ].join('\n'));

        pack(directory, '.ignore')
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    '.ignore',
                    'one.file',
                    'second.txt',
                    'another.html'
                ].sort());
            })
            .asCallback(done);
    });

    it('should not ignore the files in the unignored argument', (done) => {

        fs.writeFileSync(path.join(directory, '.ignore'), [
            'one.file',
            'second.txt',
            'another.html'
        ].join('\n'));

        pack(directory, '.ignore', ['one.file', 'another.html'])
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    '.ignore',
                    'one.file',
                    'another.html'
                ].sort());
            })
            .asCallback(done);
    });
});
