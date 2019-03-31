'use strict';

const _ = require('lodash');
// const path = require('path');

function * middleware (next) {
  if (!this.state.pageData.set) {
    //this.status = 404;
    //return;
  }

}

setup.middleware = function * (next) {
  const path = _.get(this.state, 'page.path');
  if (!path || path.indexOf('set/') !== 0) return yield next;
  const slug = this.state.relativeUrl.replace('set/', '').replace(/\/.*$/, '');
  this.body = yield this.renderTemplate('dynamic:set');
  this.type = 'text/html';
};

function setup (app, router) {
  return async function (ctx, next) {
    app.use(middleware);
  }
}

module.exports = setup;
