'use strict';

const chalk = require('chalk');

const { Transform } = require('stream');

const DEFAULT_ENCODING = 'utf-8';

exports.ChalkSpreader = class extends Transform {

    constructor(...styles) {
        super({
            decodeStrings: false
        });

        this.chalk = styles.reduce((stylesFunction, style) => stylesFunction[style], chalk);
    }

    _transform(chunk, encoding, callback) {
        try {
            if (Buffer.isBuffer(chunk)) {
                chunk = chunk.toString(DEFAULT_ENCODING);
                encoding = DEFAULT_ENCODING;
            }

            this.push(this.chalk(chunk), encoding);
            setImmediate(callback);
        } catch (error) {
            setImmediate(callback, error);
        }
    }

};
