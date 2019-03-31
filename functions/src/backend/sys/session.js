'use strict';

var session = require('koa-session');

 // Initialize Firebase for the application

function * getSession () {
  session(app)
}

function setup (app) {
  app.use(function * (next) {
    this.session = getSession;
    yield next;
  });
}

module.exports = setup;
