'use strict';

const chai = require('chai');

const { simpleOption, booleanOption, mapOption, listOption } = require('./generic-options');

const { expect } = chai;

describe('Generic Option', () => {

    describe('Simple', () => {

        it('should return the flag name and the value', () => {
            expect(simpleOption('flag')('value')).to.have.ordered.members(['--flag', 'value']);
        });

        it('should return the flag name and the value with the right flagPrefix', () => {
            expect(simpleOption('f', '-')('value')).to.have.ordered.members(['-f', 'value']);
        });

    });

    describe('Boolean', () => {

        it('should return the flag name when true', () => {
            expect(booleanOption('flag')(true)).to.have.ordered.members(['--flag']);
        });

        it('should return the empty array when false', () => {
            expect(booleanOption('flag')(false)).to.empty;
        });

        it('should return the flag name and the value with the right flagPrefix', () => {
            expect(booleanOption('f', '-')(true)).to.have.ordered.members(['-f']);
        });

    });

    describe('Map', () => {

        it('should return the flag name with key and value', () => {
            expect(mapOption('flag')({ key: 'value' })).to.have.ordered.members(['--flag', 'key=value']);
        });

        it('should return multiple flags with key and value when map has multiple entries', () => {
            expect(mapOption('flag')({ key1: 'value1', key2: 'value2' }))
                .to.have.ordered.members(['--flag', 'key1=value1', '--flag', 'key2=value2']);
        });

        it('should return the empty array when map is empty', () => {
            expect(mapOption('flag')({})).to.empty;
        });

        it('should return the flag name and the value with the right flagPrefix', () => {
            expect(mapOption('f', '-')({ key: 'value' })).to.have.ordered.members(['-f', 'key=value']);
        });

    });

    describe('List', () => {

        it('should return the flag name with key and value', () => {
            expect(listOption('flag')(['value'])).to.have.ordered.members(['--flag', 'value']);
        });

        it('should return multiple flags with key and value when map has multiple entries', () => {
            expect(listOption('flag')(['value1', 'value2']))
                .to.have.ordered.members(['--flag', 'value1', '--flag', 'value2']);
        });

        it('should return the empty array when map is empty', () => {
            expect(listOption('flag')([])).to.empty;
        });

        it('should return the flag name and the value with the right flagPrefix', () => {
            expect(listOption('f', '-')(['value'])).to.have.ordered.members(['-f', 'value']);
        });
    });

});
