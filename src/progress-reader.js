'use strict';

const bytesFormat = require('bytes');
const { Transform } = require('stream');

module.exports.ProgressReader = class extends Transform {

    constructor(options) {
        super(options);
        this.bytes = 0;
        this.lastMessageLength = 0;

        this.interval = setInterval(() => {
            this.printProgress(`Sending build context to Docker daemon ${this.getSizeString(3)}`);
        }, 500);

        this.on('end', () => {
            clearInterval(this.interval);
        });
    }

    _transform(chunk, encoding, callback) {
        if (Buffer.isBuffer(chunk)) {
            this.bytes += chunk.length;
        } else {
            this.bytes += Buffer.byteLength(chunk, encoding);
        }

        callback(null, chunk);
    }

    _flush(callback) {
        this.printProgress(`Build context (${this.getSizeString(0)}) have been send to Docker daemon`, () => {
            process.stdout.write('\n', callback);
        });
    }

    printProgress(message, callback) {
        let pad = '';

        if (message.length < this.lastMessageLength) {
            pad = new Array(this.lastMessageLength - message.length).fill(' ').join('');
        }

        this.lastMessageLength = message.length;
        process.stdout.write(`\r${message}${pad}`, callback);
    }

    getSizeString(decimalPlaces) {
        return bytesFormat(this.bytes, {
            decimalPlaces,
            fixedDecimals: true,
            unitSeparator: ' '
        });
    }
};
