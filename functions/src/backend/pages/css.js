'use strict';

const _ = require('lodash');

const fs = require('fs-promise');
const path = require('path');
const less = require('less');
const squish = require('../lib/squish');
// const mount = require('koa-mount');
const bufferFrom = require('buffer-from');

const PAGE_CSS_CACHE = {};

const packageRoot = path.resolve(__dirname, '../../..');
const srcRoot = path.resolve(packageRoot, 'src/__root__');
const lessRoot = path.resolve(srcRoot, 'less');

function * middleware (next) {
  if (!this.state.page) return yield next;

  const LESS_OPTIONS = { paths: [lessRoot], compress: squish.squishable};
  const IS_PAGE_CSS = /\/assets\/page\.css$/;

  if (!IS_PAGE_CSS.test(this.state.url.pathname)) return yield next;

  const WL = this.state.whitelabel;
  const PAGE = this.state.page.path;

  const lessFiles = _.get(this, 'state.page.assets.less');
  if (!lessFiles) {
    this.body = '/* no less files for ' + PAGE + ' */';
    this.type = 'text/css';
    return;
  }

  if (!PAGE_CSS_CACHE[WL]) PAGE_CSS_CACHE[WL] = {};
  if (!PAGE_CSS_CACHE[WL][PAGE]) {
    let lessSource = "@whitelabel: '" + WL + "';\n\n";
    lessSource += (yield lessFiles.map(file => {
      return fs.readFile(file.fullPath, 'utf8').then(x => '/***** ' + file.path + ' *****/\n' + x);
    })).join('\n\n');
    PAGE_CSS_CACHE[WL][PAGE] = bufferFrom((yield less.render(lessSource, LESS_OPTIONS)).css);
  }
  this.body = PAGE_CSS_CACHE[WL][PAGE];
  this.type = 'text/css';
}

function setup (app, router) {
  app.use(middleware);
}

module.exports = setup;
