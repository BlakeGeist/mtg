'use strict';

const _ = require('lodash');
const fs = require('fs-promise');
const path = require('path');
const Handlebars = require('handlebars');
const squish = require('../lib/squish');
const bufferFrom = require('buffer-from');
const IS_PAGE_JS = /\/assets\/page\.js$/;
const IS_CONTEXT_JS = /^\/\w{2}\/\w{2}\/context.js$/;
const IS_PAGE_CONTEXT_JS = /\/assets\/page-context.js$/;

const _TEMPLATES = {};
// const CACHE = {};

function * template (name, args) {
  if (!_TEMPLATES[name]) {
    const src = yield fs.readFile(path.resolve(this.state.paths.root, 'views/templates/' + name + '.hbs'), 'utf8');
    const tpl = Handlebars.compile(src);
    _TEMPLATES[name] = tpl;
  }

  return _TEMPLATES[name](args);
}

function * pageJSMiddleware (next) {
  const pathname = this.state.url.pathname;
  if (!IS_PAGE_JS.test(pathname)) return yield next;

  const jsFiles = _.get(this, 'state.page.assets.js') || [];

  let jsSource = (yield jsFiles.map(file => {
    return fs.readFile(file.fullPath, 'utf8').then(x => '/***** ' + file.path + ' *****/\n' + x);
  })).join('\n\n');

  const tplArgs = yield this.getTemplateArguments();

  _.extend(tplArgs, {
    source: jsSource
  });

  this.type = 'application/javascript';
  this.body = bufferFrom(squish.js(yield template.call(this, 'page-js', tplArgs)));
}

function * contextJSMiddleware (next) {
  if (!IS_CONTEXT_JS.test(this.state.url.pathname)) return yield next;

  const tplArgs = yield this.getTemplateArguments();
  this.type = 'application/javascript';
  this.body = bufferFrom(squish.js(yield template.call(this, 'context-js', tplArgs)));
}

function * pageContextJSMiddleware (next) {
  if (!IS_PAGE_CONTEXT_JS.test(this.state.url.pathname)) return yield next;

  const tplArgs = yield this.getTemplateArguments();
  this.type = 'application/javascript';
  this.body = bufferFrom(squish.js(yield template.call(this, 'page-context-js', tplArgs)));
}

function setup (app, router) {
  app.use(pageJSMiddleware);
  app.use(contextJSMiddleware);
  app.use(pageContextJSMiddleware);
}

module.exports = setup;
