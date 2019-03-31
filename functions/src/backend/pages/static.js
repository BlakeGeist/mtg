'use strict';

const _ = require('lodash');
const fs = require('fs-promise');
const mime = require('mime-types');

function * middleware (next) {
  const pathname = this.state.url.pathname;
  if (!this.state.page) return yield next;
  if (!/assets\//.test(pathname)) return yield next;
  const staticAssets = _.indexBy(_.get(this.state, 'page.assets.static') || [], 'path');
  const assetPath = this.state.relativeUrl.replace(this.state.page.path, '');
  if (!staticAssets[assetPath]) return yield next;

  const path = staticAssets[assetPath].fullPath;
  this.body = fs.createReadStream(path);
  this.type = mime.lookup(path);
}

function setup (app, router) {
  app.use(middleware);
}

module.exports = setup;
