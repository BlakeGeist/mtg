'use strict';

// const _ = require('lodash');

function * renderError (errorType, status, variant) {
  // it's ok to assume /us/en here since this is just for asset paths
  if (!variant) {
    variant = {region: 'us', language: 'en'};
  }

  const prefix = '/' + variant.region + '/' + variant.language;

  this.state.pageData = {
    errorType: errorType,
    isNotFound: errorType === 'not-found',
    isForbidden: errorType === 'forbidden',
    isUnauthorized: errorType === 'unauthorized',
    isOtherError: errorType === 'error',
    status: status,
    assetPathOverride: prefix + '/errors/assets'
  };

  this.body = yield this.renderTemplate('content:errors');
  this.type = 'text/html';
  this.status = status;
}

function * middleware (next) {
  try {
    yield next;
  } catch (e) {
    yield renderError.call(this, 'error', 500, this.state.variant || null);
    return;
  }

  const status = this.status;

  if (status < 400) return;

  const errorType = (
    status === 404 ? 'not-found'
    : status === 403 ? 'forbidden'
    : status === 401 ? 'unauthorized'
    : 'error');

  yield renderError.call(this, errorType, status, this.state.variant);
}

function setup (app, router) {
  app.on('error', async function (err, ctx) {
    ctx.body = {
      message: err.message,
      stack: err.stack
    }
  });
  app.use(middleware);
}

setup.middleware = middleware;

module.exports = setup;
