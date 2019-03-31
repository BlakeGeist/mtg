'use strict';

const configs = require('../../../configs.json');
const _ = require('lodash');
const request = require('request-promise');
const queryString = require('query-string');
function * middleware (next) {
  if (!this.state.page) return yield next;

  const myPath = this.state.relativeUrl.replace(/\/$/, '');
  const myIndexPath = myPath === '' ? 'index' : myPath + '/index';
  const pagePath = this.state.page.path.replace(/\/$/, '');
  if (myPath !== pagePath && myIndexPath !== pagePath) return yield next;

  const tplPath = this.state.page.template;
  const tplArgs = yield this.getTemplateArguments();
  //changeLogo updated partnerLogo
  if(this.partnerLogo) {
    tplArgs.settings.partnerUrl = this.url;
  }
  tplArgs.settings.partnerLogo = (this.partnerLogo) ? this.partnerLogo : tplArgs.settings.partnerLogo
  const data = yield this.renderTemplate(tplPath, tplArgs);
  this.body = data;
  this.type = 'text/html';
}

function getApiClient () {
  const apiClient = request.defaults({
     baseUrl: configs.api.internalUrl,
     forever: true,
     json: true,
     simple: false,
     resolveWithFullResponse: true
  });
  return apiClient;
}


function setup (app, router) {
  return async function (ctx, next) {    
    app.use(middleware);
  }
}

module.exports = setup;
