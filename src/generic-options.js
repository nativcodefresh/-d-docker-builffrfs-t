'use strict';

exports.simpleOption = (name, flagPrefix = '--') => {
    const flag = `${flagPrefix}${name}`;
    return value => [flag, value];
};

exports.booleanOption = (name, flagPrefix = '--') => {
    const flag = `${flagPrefix}${name}`;
    return value => (value ? [flag] : []);
};

exports.mapOption = (name, flagPrefix = '--') => {
    const flag = `${flagPrefix}${name}`;
    return map => Object.keys(map)
        .reduce((acc, key) => acc.concat(flag, `${key}=${map[key]}`), []);
};

exports.listOption = (name, flagPrefix = '--') => {
    const flag = `${flagPrefix}${name}`;
    return list => list
        .reduce((acc, item) => acc.concat(flag, item), []);
};
