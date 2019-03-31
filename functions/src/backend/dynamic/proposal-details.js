'use strict';

const _ = require('lodash');

function * proposalDetailsPage (next) {
  if (!this.state.pageData.proposal) {
    this.status = 404;
    return;
  }
  this.body = yield this.renderTemplate('dynamic:proposal');
  this.type = 'text/html';
}

proposalDetailsPage.middleware = function * (next) {
  const path = _.get(this.state, 'page.path');
  if (!path || path.indexOf('proposal/') !== 0) return yield next;
  const slug = this.state.relativeUrl.replace('proposal/', '').replace(/\/.*$/, '');
  yield next;
};

module.exports = proposalDetailsPage;
