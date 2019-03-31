'use strict';

// const _ = require('lodash');

function * middleware (next) {
  // we don't have state.url yet
  const url = this.url.replace(/\?.*$/, '');
  if (url.indexOf('/assets') > -1 && !/page.js$/.test(url)) {
    const etag = this.state.buildSettings.buildId;
    const lastmod = new Date(this.state.buildSettings.buildTime).toUTCString();
    this.set('ETag', etag);
    this.set('Last-Modified', lastmod); // warning: the static handlers for /assets will overwrite this with the file's timestamp
    if (this.fresh) {
      this.status = 304;
      return;
    }
  }
  return yield next;
}

function setup (app, router) {
  app.use(middleware);
}

module.exports = setup;
