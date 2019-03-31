#!/usr/bin/env node
'use strict';

require('dotenv').config({silent: true});
var firebase = require("firebase");

console.log("Environment:::::", process.env.NODE_ENV);
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'dev';

const koa = require('koa');
const Router = require('koa-router');
const buildSettings = require('./src/backend/lib/build-settings');
const configs = require('./configs.json');
if (!configs.env) configs.env = process.env.NODE_ENV;

const app = koa();
const router = new Router();       // will be passed to components
app.component = n => component(n); // shortcut
app.proxy = true;

(app                             // App Configuration:
  .use(buildSettings)            // production build settings
  .component('sys/init')         // set up whitelabel & paths & initial this.state stuff
  .component('sys/render')       // adds this.renderTemplate()
  .component('sys/errors')       // error handling routes
  .component('sys/page-info')    // adds asset and page config data to this.state
  .component('sys/data')         // sets up this.fetch() as an interface to api
  .component('sys/page-data')    // fetches data from api for content/dynamic pages
  .component('sys/etag')         // handles etags for everything other than page.js and page template renders
  .component('sys/assets')       // everything in the root /assets folder. this comes first because speed.
  .component('sys/slash')        // redirect page to page/
  .component('sys/main-css')     // compiles main.less to main.css
  .component('sys/handlebars')   // sets up handlebars for node and browser
  .component('sys/healthcheck')  // health-check script
  .component('sys/scripts')      // renders <script> tags into dom
  .component('dynamic/routes')   // routes for specific dynamic pages
  .component('pages/css')        // css for both content and dynamic pages
  .component('pages/scripts')    // javascript for both content and dynamic pages
  .component('pages/handlebars') // renders content/dynamic pages that don't get handled by dynamic/routes
  .component('pages/static')     // serves page-specific static assets
  .use(router.routes())          // enable the router after all other middlewares have run
  .listen(8081, startup)         // start the server
);

function component (name) {
  const _module = require('./src/backend/' + name);
  _module(app, router, configs);
  return app;
}

function startup () {
  console.log('Neo-Server Listening on port 8081');
}
