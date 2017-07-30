'use strict';

const chai = require('chai');
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

chai.use(sinonChai);
const { expect } = chai;
const { match } = sinon;

function createChalkMock(stub) {
    const proxied = () => {};
    proxied.styles = [];

    return new Proxy(proxied, {
        get: (target, style, proxy) => {
            target.styles.push(style);

            return proxy;
        },
        apply: (target, thisArg, argumentsList) => {
            return stub(target.styles, ...argumentsList);
        }
    });
}

function createChalkSpreader(styles, { chalkStub, pushSpy }) {
    const { ChalkSpreader } = proxyquire('./chalk-spreader', {
        'chalk': createChalkMock(chalkStub || (() => {}))
    });

    const chalkSpreader = new ChalkSpreader(...styles);

    chalkSpreader.push = pushSpy || (() => {});

    return chalkSpreader;
}

describe('Chalk Spreader', () => {

    it('should transform a string to a it\'s chalked string', () => {

        const chalkStub = () => 'Chalked String';
        const pushSpy = sinon.spy();
        const chalkSpreader = createChalkSpreader(['style1', 'style2'], { chalkStub, pushSpy });

        chalkSpreader._transform('original string', 'utf-8', () => {});

        expect(pushSpy).to.have.been.calledWithExactly('Chalked String', 'utf-8');
    });

    it('should transform a string to a through chalk', () => {

        const chalkStub = sinon.stub();
        const chalkSpreader = createChalkSpreader(['style1', 'style2'], { chalkStub });

        chalkSpreader._transform('original string', 'utf-8', () => {});

        expect(chalkStub).to.have.been.calledWithMatch(match.any, 'original string');
    });

    it('should transform a string with the right styles', () => {

        const chalkStub = sinon.stub();
        const chalkSpreader = createChalkSpreader(['style1', 'style2'], { chalkStub });

        chalkSpreader._transform('original string', 'utf-8', () => {});

        expect(chalkStub).to.have.been.calledWithMatch(['style1', 'style2'], match.any);
    });

    it('should transform a buffer to a through chalk', () => {

        const chalkStub = sinon.stub();
        const chalkSpreader = createChalkSpreader(['style1', 'style2'], { chalkStub });

        chalkSpreader._transform(Buffer.from('original string', 'utf8'), 'buffer', () => {});

        expect(chalkStub).to.have.been.calledWithMatch(match.any, 'original string');
    });

    it('should call the callback after transform', (done) => {

        const pushSpy = sinon.spy();
        const chalkSpreader = createChalkSpreader(['style1', 'style2'], { pushSpy });

        const callbackStub = sinon.stub();
        chalkSpreader._transform('original string', 'utf-8', callbackStub);

        callbackStub.callsFake(() => {
            expect(callbackStub).to.have.been.calledAfter(pushSpy);
            done();
        });
    });

    it('should call the callback with no arguments when transform successful', (done) => {

        const chalkSpreader = createChalkSpreader(['style1', 'style2'], {});

        const callbackStub = sinon.stub();
        chalkSpreader._transform('original string', 'utf-8', callbackStub);

        callbackStub.callsFake(() => {
            expect(callbackStub).to.have.been.calledWithExactly();
            done();
        });
    });

    it('should call the callback with error when transform failed', (done) => {

        const error = new Error('Transform Error');
        const chalkStub = () => { throw error; };
        const chalkSpreader = createChalkSpreader(['style1', 'style2'], { chalkStub });

        const callbackStub = sinon.stub();
        chalkSpreader._transform('original string', 'utf-8', callbackStub);

        callbackStub.callsFake(() => {
            expect(callbackStub).to.have.been.calledWithExactly(error);
            done();
        });
    });
});
