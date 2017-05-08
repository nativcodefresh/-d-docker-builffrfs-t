/* eslint-env mocha */

'use strict';

const chai         = require('chai');
const proxyquire   = require('proxyquire').noCallThru();
const sinon        = require('sinon');
const sinonChai    = require('sinon-chai');
const fs           = require('fs');
const rimraf       = require('rimraf');
const path         = require('path');
const { Readable, Writable } = require('stream');

const expect = chai.expect;
chai.use(sinonChai);

describe('Packer', () => {

    let pack;
    let directory;
    let packingMock;

    function waitForStream(stream) {
        return new Promise((resolve, reject) => {
            stream
                .on('data', () => {})
                .on('error', reject)
                .on('end', resolve);
        });
    }

    beforeEach(() => {
        packingMock = sinon.mock();
        pack        = proxyquire('./packer', {
            'tar-stream': {
                pack: () => {
                    const packedFiles = [];

                    return new (class extends Readable {
                        constructor() {
                            super({});
                            this.push('Hello World', 'utf-8');
                        }

                        _read() {}

                        entry({ name: filepath }) {
                            packedFiles.push(filepath);

                            return new (class extends Writable {
                                _write(chunk, encoding, callback) {
                                    setImmediate(callback);
                                }
                            })();
                        }

                        finalize() {
                            packingMock(packedFiles.sort());
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

    it('should pack all the files when ignore file empty', () => {
        return pack(directory, '.ignore')
            .then(waitForStream)
            .then(() => {
                expect(packingMock).to.be
                    .calledWithExactly(['.ignore', 'one.file', 'second.txt', 'another.html'].sort());
            });
    });

    it('should pack all the files when ignore file missing', () => {
        fs.unlinkSync(path.join(directory, '.ignore'));

        return pack(directory, '.ignore')
            .then(waitForStream)
            .then(() => {
                expect(packingMock)
                    .to
                    .be
                    .calledWith(['one.file', 'second.txt', 'another.html'].sort());
            });
    });

    it('should pack all files which isn\'t ignore', () => {
        fs.writeFileSync(path.join(directory, 'other.log'));

        fs.writeFileSync(path.join(directory, 'another.log'));

        fs.writeFileSync(path.join(directory, 'file.txt'));

        fs.writeFileSync(path.join(directory, '.ignore'), [
            'fi??.txt',
            'one',
            '*.log',
            'another.html'
        ].join('\n'));


        return pack(directory, '.ignore')
            .then(waitForStream)
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    '.ignore',
                    'one.file',
                    'second.txt'
                ].sort());
            });
    });

    it('should not ignore files when pattern starts with /', () => {

        fs.writeFileSync(path.join(directory, '.ignore'), [
            '/another.html'
        ].join('\n'));


        return pack(directory, '.ignore')
            .then(waitForStream)
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    '.ignore',
                    'one.file',
                    'second.txt',
                    'another.html'
                ].sort());
            });
    });

    it('should pack file in sub-directories', () => {
        fs.mkdirSync(path.join(directory, 'sub'));

        fs.writeFileSync(path.join(directory, 'sub', 'file.txt'));

        return pack(directory, '.ignore')
            .then(waitForStream)
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    '.ignore',
                    'one.file',
                    'second.txt',
                    'another.html',
                    'sub/file.txt'
                ].sort());
            });
    });

    it('should only ignore files on root directory or with path specified from root', () => {
        fs.mkdirSync(path.join(directory, 'sub'));

        fs.writeFileSync(path.join(directory, 'sub', 'file.txt'));

        fs.writeFileSync(path.join(directory, '.ignore'), [
            '*.txt'
        ].join('\n'));

        return pack(directory, '.ignore')
            .then(waitForStream)
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    '.ignore',
                    'one.file',
                    'another.html',
                    'sub/file.txt'
                ].sort());
            });
    });

    it('should only ignore directories on root directory or with path specified from root', () => {
        fs.mkdirSync(path.join(directory, 'sub'));
        fs.mkdirSync(path.join(directory, 'dir'));
        fs.mkdirSync(path.join(directory, 'sub', 'dir'));

        fs.writeFileSync(path.join(directory, 'sub', 'dir', 'file.txt'));
        fs.writeFileSync(path.join(directory, 'dir', 'file.txt'));

        fs.writeFileSync(path.join(directory, '.ignore'), [
            'dir'
        ].join('\n'));

        return pack(directory, '.ignore')
            .then(waitForStream)
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    '.ignore',
                    'one.file',
                    'second.txt',
                    'another.html',
                    'sub/dir/file.txt'
                ].sort());
            });
    });

    it('should ignore every file in pattern if the globstar present', () => {

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

        return pack(directory, '.ignore')
            .then(waitForStream)
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    '.ignore',
                    'one.file',
                    'second.txt',
                    'sub/dir2/ab.log',
                    'sub/some.bin'
                ].sort());
            });
    });

    it('should negate ignores', () => {

        fs.writeFileSync(path.join(directory, 'ignored.html'));

        fs.writeFileSync(path.join(directory, '.ignore'), [
            '*.html',
            '!a*.html'
        ].join('\n'));

        return pack(directory, '.ignore')
            .then(waitForStream)
            .then(() => {
                expect(packingMock).to.be
                    .calledWithExactly(['.ignore', 'one.file', 'second.txt', 'another.html'].sort());
            });
    });

    it('should negate ignores by the last pattern match', () => {

        fs.writeFileSync(path.join(directory, 'ignored.html'));

        fs.writeFileSync(path.join(directory, '.ignore'), [
            '!ignored.html',
            '*.html'
        ].join('\n'));

        return pack(directory, '.ignore')
            .then(waitForStream)
            .then(() => {
                expect(packingMock).to.be
                    .calledWithExactly(['.ignore', 'one.file', 'second.txt'].sort());
            });
    });

    it('should allows comment in dockerfile', () => {

        fs.writeFileSync(path.join(directory, '.ignore'), [
            '',
            '*.html',
            '',
            '',
            '# comment'
        ].join('\n'));

        return pack(directory, '.ignore')
            .then(waitForStream)
            .then(() => {
                expect(packingMock).to.be
                    .calledWithExactly(['.ignore', 'one.file', 'second.txt'].sort());
            });
    });

    it('should ignore directory with . when using ** pattern', () => {
        fs.mkdirSync(path.join(directory, '.sub'));

        fs.writeFileSync(path.join(directory, '.sub', 'file.txt'));

        fs.writeFileSync(path.join(directory, '.ignore'), [
            '**/file.txt'
        ].join('\n'));

        return pack(directory, '.ignore')
            .then(waitForStream)
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    '.ignore',
                    'one.file',
                    'second.txt',
                    'another.html'
                ].sort());
            });
    });

    it('should ignore file with . when using * pattern', () => {

        fs.writeFileSync(path.join(directory, '.ignore'), [
            '.*'
        ].join('\n'));

        return pack(directory, '.ignore')
            .then(waitForStream)
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    'one.file',
                    'second.txt',
                    'another.html'
                ].sort());
            });
    });

    it('should ignore file when using [Ii] pattern', () => {

        fs.writeFileSync(path.join(directory, '.Ignore'));

        fs.writeFileSync(path.join(directory, '.ignore'), [
            '.[Ii]gnore'
        ].join('\n'));

        return pack(directory, '.ignore')
            .then(waitForStream)
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    'one.file',
                    'second.txt',
                    'another.html'
                ].sort());
            });
    });

    it('should ignore file when using [a-z] pattern', () => {

        fs.writeFileSync(path.join(directory, '.agnore'));
        fs.writeFileSync(path.join(directory, '.tgnore'));
        fs.writeFileSync(path.join(directory, '.xgnore'));

        fs.writeFileSync(path.join(directory, '.ignore'), [
            '.[a-z]gnore'
        ].join('\n'));

        return pack(directory, '.ignore')
            .then(waitForStream)
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    'one.file',
                    'second.txt',
                    'another.html'
                ].sort());
            });
    });

    it('should ignore file when using [\\\\\\-\\^] pattern', () => {

        fs.writeFileSync(path.join(directory, 'go-to'));
        fs.writeFileSync(path.join(directory, 'go_to'));
        fs.writeFileSync(path.join(directory, 'go\\to'));
        fs.writeFileSync(path.join(directory, 'go^to'));

        fs.writeFileSync(path.join(directory, '.ignore'), [
            'go[\\-_\\^\\\\]to'
        ].join('\n'));

        return pack(directory, '.ignore')
            .then(waitForStream)
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    '.ignore',
                    'one.file',
                    'second.txt',
                    'another.html'
                ].sort());
            });
    });

    it('should ignore file when using [^i] pattern', () => {

        fs.writeFileSync(path.join(directory, '.Ignore'));

        fs.writeFileSync(path.join(directory, '.ignore'), [
            '.[^i]gnore'
        ].join('\n'));

        return pack(directory, '.ignore')
            .then(waitForStream)
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    '.ignore',
                    'one.file',
                    'second.txt',
                    'another.html'
                ].sort());
            });
    });

    it('should not ignore the files in the unignored argument', () => {

        fs.writeFileSync(path.join(directory, '.ignore'), [
            'one.file',
            'second.txt',
            'another.html'
        ].join('\n'));

        return pack(directory, '.ignore', ['one.file', 'another.html'])
            .then(waitForStream)
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    '.ignore',
                    'one.file',
                    'another.html'
                ].sort());
            });
    });

    it('should pack file in sub-directories which are unignored in file', () => {
        fs.mkdirSync(path.join(directory, 'sub'));
        fs.writeFileSync(path.join(directory, 'sub', 'file.txt'));

        fs.mkdirSync(path.join(directory, 'sub', 'unignored'));
        fs.writeFileSync(path.join(directory, 'sub', 'unignored',  'somefile.bin'));

        fs.writeFileSync(path.join(directory, '.ignore'), [
            'sub/*',
            '!sub/unignored'
        ].join('\n'));

        return pack(directory, '.ignore')
            .then(waitForStream)
            .then(() => {
                expect(packingMock).to.be.calledWithExactly([
                    '.ignore',
                    'one.file',
                    'second.txt',
                    'another.html',
                    'sub/unignored/somefile.bin'
                ].sort());
            });
    });
});
