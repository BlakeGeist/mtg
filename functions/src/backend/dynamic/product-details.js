'use strict';

const _ = require('lodash');
// const path = require('path');

function * productDetailsPage (next) {
  if (!this.state.pageData.product) {
    //this.status = 404;
    //return;
  }
  this.body = yield this.renderTemplate('dynamic:product');
  this.type = 'text/html';
}

productDetailsPage.middleware = function * (next) {
  const path = _.get(this.state, 'page.path');
  if (!path || path.indexOf('product/') !== 0) return yield next;
  const slug = this.state.relativeUrl.replace('product/', '').replace(/\/.*$/, '');
  yield next;
};

module.exports = productDetailsPage;
