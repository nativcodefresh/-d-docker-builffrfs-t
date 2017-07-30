'use strict';

const Promise = require('bluebird');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const Emitter = require('events');
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

chai.use(sinonChai);
chai.use(chaiAsPromised);
const { expect } = chai;
const { match } = sinon;

function createSpawnMock(spawnStub) {
    return (...args) => {
        const emitter = new Emitter();

        Promise.resolve(spawnStub(...args) || {})
            .then((result) => {
                result = result || {};
                emitter.emit('exit', result.code || 0, result.stdout || '', result.stderr || '');
            });

        return emitter;
    };
}

function createRegistryConfigOption({ spawnStub }) {
    const { registryConfigOption } = proxyquire('./registries', {
        'child_process': {
            spawn: createSpawnMock(spawnStub || (() => {}))
        }
    });

    return registryConfigOption;
}

describe('Registry Config Option', () => {

    it('should always ignore stdio of the span process', () => {
        const spawnStub = sinon.stub();
        const registryConfigOption = createRegistryConfigOption({ spawnStub });

        return registryConfigOption({
            'registry1.io': { username: 'hello', password: 'world' },
            'registry2.io': { username: 'hello', password: 'world' },
            'registry3.io': { username: 'hello', password: 'world' }
        })
            .then(() => {
                expect(spawnStub).to.have.been.always.calledWithMatch(match.any, match.any, { stdio: 'ignore' });
            });
    });

    it('should always call to docker command', () => {
        const spawnStub = sinon.stub();
        const registryConfigOption = createRegistryConfigOption({ spawnStub });

        return registryConfigOption({
            'registry1.io': { username: 'hello', password: 'world' },
            'registry2.io': { username: 'hello', password: 'world' },
            'registry3.io': { username: 'hello', password: 'world' }
        })
            .then(() => {
                expect(spawnStub).to.have.been.always.calledWithMatch('docker', match.any, match.any);
            });
    });

    it('should call the command command with the right arguments', () => {
        const spawnStub = sinon.stub();
        const registryConfigOption = createRegistryConfigOption({ spawnStub });

        return registryConfigOption({
            'registry1.io': { username: 'user1', password: 'pass1' },
            'registry2.io': { username: 'user2', password: 'pass2' },
            'registry3.io': { username: 'user3', password: 'pass3' }
        })
            .then(() => {
                expect(spawnStub).to.have.been
                    .calledWithMatch(match.any, ['login', 'registry1.io', '-u', 'user1', '-p', 'pass1'], match.any);

                expect(spawnStub).to.have.been
                    .calledWithMatch(match.any, ['login', 'registry2.io', '-u', 'user2', '-p', 'pass2'], match.any);

                expect(spawnStub).to.have.been
                    .calledWithMatch(match.any, ['login', 'registry3.io', '-u', 'user3', '-p', 'pass3'], match.any);
            });
    });

    it('should not call any command before the first have finished', () => {
        const spawnStub = sinon.stub();
        const registryConfigOption = createRegistryConfigOption({ spawnStub });

        spawnStub.onFirstCall().callsFake(() => Promise.try(() => {
            expect(spawnStub).to.not.have.been.calledTwice;
        }));

        return registryConfigOption({
            'registry1.io': { username: 'user1', password: 'pass1' },
            'registry2.io': { username: 'user2', password: 'pass2' }
        });
    });

    it('should call all commands even if one failed', () => {
        const spawnStub = sinon.stub();
        const registryConfigOption = createRegistryConfigOption({ spawnStub });

        spawnStub.onSecondCall().returns({ code: 1 });

        return registryConfigOption({
            'registry1.io': { username: 'user1', password: 'pass1' },
            'registry2.io': { username: 'user2', password: 'pass2' },
            'registry3.io': { username: 'user3', password: 'pass3' }
        })
            .then(() => {
                expect(spawnStub).to.have.been
                    .calledWithMatch(match.any, ['login', 'registry1.io', '-u', 'user1', '-p', 'pass1'], match.any);

                expect(spawnStub).to.have.been
                    .calledWithMatch(match.any, ['login', 'registry2.io', '-u', 'user2', '-p', 'pass2'], match.any);

                expect(spawnStub).to.have.been
                    .calledWithMatch(match.any, ['login', 'registry3.io', '-u', 'user3', '-p', 'pass3'], match.any);
            });
    });

    it('should always resolved to an empty array', () => {
        const spawnStub = sinon.stub();
        const registryConfigOption = createRegistryConfigOption({ spawnStub });

        spawnStub.onSecondCall().returns({ code: 1 });

        const registryConfigOptionResult = registryConfigOption({
            'registry1.io': { username: 'user1', password: 'pass1' },
            'registry2.io': { username: 'user2', password: 'pass2' },
            'registry3.io': { username: 'user3', password: 'pass3' }
        });

        return expect(registryConfigOptionResult).to.eventually.be.an('array').but.be.empty;
    });
});
