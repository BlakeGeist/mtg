'use strict';

const handlebarsSupport = require('../lib/handlebars-support');
handlebarsSupport.serverSideSetup();

function * helpers () {
  this.body = yield handlebarsSupport.renderHelpers();
  this.type = 'application/javascript';
}

function * partials () {
  this.body = yield handlebarsSupport.renderPartials();
  this.type = 'application/javascript';
}

async function all (ctx) {

  const parts = await handlebarsSupport.renderAll();

  ctx.body = parts.helpers + parts.partials;

  ctx.type = 'application/javascript';

}

function setup (app, router) {
  router.get('/assets/js/handlebars-partials.js', partials);
  router.get('/assets/js/handlebars-helpers.js', helpers);
  router.get('/assets/js/handlebars-support.js', all);
}

module.exports = setup;
