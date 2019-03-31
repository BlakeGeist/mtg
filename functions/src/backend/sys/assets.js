'use strict';

const path = require('path');
const squish = require('../lib/squish');
const projectRoot = path.resolve(__dirname, '../../..');
const staticBase = path.resolve(projectRoot, 'src/__root__');
const staticJs = path.resolve(staticBase, 'js');
const staticCss = path.resolve(staticBase, 'css');
const staticImg = path.resolve(staticBase, 'img');
const staticFonts = path.resolve(staticBase, 'fonts');
const staticLess = path.resolve(staticBase, 'less');
const fs = require('fs-promise');
const bufferFrom = require('buffer-from');

const serve = require('koa-static');
const mount = require('koa-mount');
const ezStatic = (app, webPath, fsPath) => app.use(mount(webPath, serve(fsPath, {maxage: 0})));

function * cssAssets (next) {
  if (this.url.indexOf('/assets/css') !== 0) return yield next;
  const chunk = this.url.replace(/\?.*$/, '').replace(/^\/assets\/css\//, '');
  const fullPath = path.resolve(staticCss, chunk);

  try {
    yield fs.stat(fullPath);
  } catch (e) {
    return yield next;
  }

  this.body = bufferFrom(squish.css(yield fs.readFile(fullPath, 'utf8')));
  this.type = 'text/css';
}

function * lessAssets (next) {
  if (this.url.indexOf('/assets/less') !== 0) return yield next;
  const chunk = this.url.replace(/\?.*$/, '').replace(/^\/assets\/less\//, '');
  const fullPath = path.resolve(staticCss, chunk);

  try {
    yield fs.stat(fullPath);
  } catch (e) {
    return yield next;
  }

  this.body = bufferFrom(squish.css(yield fs.readFile(fullPath, 'utf8')));
  this.type = 'text/css';
}

function * jsAssets (next) {
  if (this.url.indexOf('/assets/js') !== 0) return yield next;
  const chunk = this.url.replace(/\?.*$/, '').replace(/^\/assets\/js\//, '');
  const fullPath = path.resolve(staticJs, chunk);

  // assuming this block is simply error checking, if yes,
  // try should also include the below
  // let stat; // let wont work for line 54 per closure
  try {
    yield fs.stat(fullPath);
  } catch (e) {
    return yield next;
  }

  this.body = bufferFrom(squish.js(yield fs.readFile(fullPath, 'utf8')));
  this.type = 'application/javascript';
}

function setup (app) {
  if (squish.squishable) {
    app.use(jsAssets);
    app.use(cssAssets);
  } else {
    ezStatic(app, '/assets/js', staticJs);
    ezStatic(app, '/assets/css', staticCss);
  }
  ezStatic(app, '/assets/img', staticImg);
  ezStatic(app, '/assets/fonts', staticFonts);
  ezStatic(app, '/assets/less', staticLess);
}

module.exports = setup;
