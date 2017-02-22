'use strict';

const gulp        = require('gulp');
const eslint      = require('gulp-eslint');
const rimraf      = require('gulp-rimraf');
const fs          = require('fs');
const coveralls   = require('gulp-coveralls');
const istanbul    = require('gulp-istanbul');
const isparta     = require('isparta');
const mocha       = require('gulp-mocha-co');
const shell       = require('shelljs');

gulp.task('no-only', (callback) => {
    shell.exec(`find . -path "*/*.spec.js" -type f -exec grep -l "describe.only" {} + 
          find . -path "*/*.spec.js" -type f -exec grep -l "it.only" {} +`, (code, output) => {
        if (output) {
            return callback(new Error('The following files contain .only in their tests'));
        }
        return callback();
    });
});


gulp.task('lint', ['clean'], () => {
    return gulp.src(['**/*.js', '!**/node_modules/**', '!**/server/migration/**', '!coverage/**/*.js'])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});

gulp.task('test', () => {
    return gulp.src(['**/*.js', '!**/*.spec.js', '!**/node_modules/**/*.js', '!.debug/**/*.js', '!gulpfile.js', '!newrelic.js', '!lib/index.js', '!coverage/**/*.js'])
        .pipe(istanbul({ // Covering files
            instrumenter: isparta.Instrumenter,
            includeUntested: true
        }))
        .pipe(istanbul.hookRequire()) // Force `require` to return covered files
        .on('finish', () => {
            gulp.src(['**/*.unit.spec.js', '!**/node_modules/**/*.js', '!lib/index.js'], { read: false })
                .pipe(mocha({ reporter: 'spec', timeout: '10000' }))
                .pipe(istanbul.writeReports({
                    reporters: ['lcov'],
                    reportOpts: { dir: 'coverage' }
                }))
                .once('end', () => {
                    process.exit();
                });
        });
});

gulp.task('clean', () => {
    return gulp.src(['.coverdata', '.debug', '.coverrun'], { read: false })
        .pipe(rimraf());
});

gulp.task('coveralls', (callback) => {
    const repoToken = process.env.COVERALLS_TOKEN;
    if (!repoToken) {
        callback(new Error('COVERALLS_TOKEN environment variable is missing'));
    } else {
        fs.writeFile('.coveralls.yml', `service_name: codefresh-io\nrepo_token: ${repoToken}`, (err) => {
            if (err) {
                callback(err);
            }            else {
                gulp.src('coverage/lcov.info')
                    .pipe(coveralls());
            }
        });
    }
});
