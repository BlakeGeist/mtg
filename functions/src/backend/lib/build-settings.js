'use strict';

// const _ = require('lodash');

let buildSettings;
try {
  // in prod/stage this will contain info about the build process that may be relevant
  buildSettings = require('../../../build-settings.json');
} catch (e) {
  const now = Date.now();
  buildSettings = {
    buildTime: now,
    buildId: 'dev-' + now,
    versions: process.versions
  };
}

function * middleware (next) {
  this.state.buildSettings = buildSettings;
  yield next;
}

module.exports = middleware;
middleware.buildSettings = buildSettings;
