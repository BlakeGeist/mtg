'use strict';

const _ = require('lodash');
const fs = require('fs-promise');
const co = require('co');
const path = require('path');
const squish = require('../lib/squish');
const handlebarsSupport = require('../lib/handlebars-support');
const buildSettings = require('../lib/build-settings').buildSettings;

const env = process.env.NODE_ENV || 'dev';

const STATIC_CACHE = {
  platform: null,
  vendor: null,
  early: null
};

const JS_ROOT = path.resolve(__dirname, '../../__root__/js');
const EARLY_JS = [
  'system/pre-init'
];
const VENDOR_JS = [
  {ieConditional: 'lte IE 9', script: 'html5shiv'},
  //'vendor/jquery',
  'vendor/jquery-3.3.1',
  'vendor/jquery.mobile',
  'vendor/jquery-ui',
  'vendor/jquery.lazy.min',
  'vendor/lodash',
  'vendor/eventemitter2',
  'vendor/basil',
  'vendor/jwt-decode',
  'vendor/handlebars',
  'vendor/swag',
  'vendor/moment'
];
const PLATFORM_JS = [
  'main',
  {
    env: 'dev',
    script: 'dev'
  },
  'system/api',
  'system/helpers',
  'system/ui-preferences',
  'system/nav',
  'system/modal',
  'system/me',
  'system/firebase',
  {dynamic: 'handlebars'},
  'core/standard-ui',
  'core/standard-modals',
  'core/auth',
];

function jsWrap (src) {
  return '(function (window, document) {' + src + '}).call(this, window, document);';
}

function preamble (entry) {
  const str = '\n/* ----> ' + entry + ' */\n';
  return str;
}

function loadItem (item) {
  const env = process.env.NODE_ENV || 'dev';

  if (typeof item === 'string') {
    return loadJsFile(item);
  }

  if (item.ieConditional) {
    return Promise.resolve(preamble(item.script + ' (skipped due to ie conditional)'));
  }

  if (item.env) {
    return (env === item.env) ? loadJsFile(item.script) : Promise.resolve(preamble(item.script + ' (skipped due to env: ' + env + '!=' + item.env + ')'));
  }

  if (item.dynamic) {
    if (item.dynamic === 'handlebars') {
      return (handlebarsSupport.renderAll().then(contents => preamble('dynamic:handlebars') + contents.helpers + contents.partials));
    }

    // unknown dynamic asset type
    return Promise.resolve(preamble('Unknown dynamic type ' + item.dynamic));
  }

  // type is either unsupported via load, or is intentionally not part of the concatenation
  return Promise.resolve(preamble('Unknown: ' + JSON.stringify(item)));
}

function loadJsFile (p) {
  return fs.readFile(path.resolve(JS_ROOT, p + '.js'), 'utf8').then(contents => preamble('script: ' + p) + contents);
}

const currentlyRendering = {}; // this cache ensures we're only ever doing one render process per bundle even if a whole bunch of requests come in
function * renderJsBundle (sources) {
  const cacheKey = JSON.stringify(sources);

  if (currentlyRendering[cacheKey]) {
    return yield currentlyRendering[cacheKey];
  }

  currentlyRendering[cacheKey] = (
    Promise.all(sources.map(loadItem))
      .then(array => array.join('\n\n'))
      .then(joined => jsWrap(joined))
      .then(wrapped => squish.js(wrapped))
  );

  const data = yield currentlyRendering[cacheKey];
  delete currentlyRendering[cacheKey];
  return new Buffer(data);
}

function * renderJsRoute (key, sources) {

  this.type = 'application/javascript';

  if (STATIC_CACHE[key]) {
    this.body = STATIC_CACHE[key];
    return;
  }

  this.body = yield renderJsBundle(sources, false);
}

function * renderEarlyJs (next) {
  return yield renderJsRoute.call(this, 'early', EARLY_JS);
}

function * renderVendorJs (next) {
  return yield renderJsRoute.call(this, 'vendor', VENDOR_JS);
}

function * renderPlatformJs (next) {
  return yield renderJsRoute.call(this, 'platform', PLATFORM_JS);
}

function scriptTag (src) {
  const ts = buildSettings.buildTime;
  return '\n<script src="/assets/js/' + src + '.js?t=' + ts + '" data-cfasync="false"></script>';
}

function scriptTagForItem (item) {
  if (typeof item === 'string') return scriptTag(item);
  if (item.ieConditional) return ('<!--[' + item.ieConditional + ']>' + scriptTag(item.script) + '<![endif]-->');
  if (item.env) return item.env === env ? scriptTag(item.script) : '';
  if (item.dynamic) {
    if (item.dynamic === 'handlebars') {
      return scriptTag('handlebars-support');
    }
    return '';
  }
  return '';
}

function * fillCaches () {
  _.extend(STATIC_CACHE, yield {
    platform: renderJsBundle(PLATFORM_JS),
    vendor: renderJsBundle(VENDOR_JS),
    early: renderJsBundle(EARLY_JS)
  });
}

function getConcatenatedTags (array, mainscript) {
  return (array
    .filter(x => !!x.ieConditional)
    .concat([mainscript])
    .map(scriptTagForItem)
    .filter(x => !!x.length)
    .join('\n'));
}

function getIndividualTags (array) {
  return array.map(scriptTagForItem).join('\n');
}

function * prepareScriptTags (next) {
  const getTags = squish.squishable ? getConcatenatedTags : getIndividualTags;

  this.state.SCRIPTS = {
    vendor: getTags(VENDOR_JS, '__vendor__'),
    platform: getTags(PLATFORM_JS, '__platform__'),
    early: getTags(EARLY_JS, '__early__')
  };
  yield next;
}

function serverInit () {
  if (!squish.squishable) return;
  co(fillCaches)
    .then(() => console.log('Pre-Cached concatenated javascript files!'))
    .catch(e => console.error('error during javascript pre-cache operation', e.stack));
}

function setup (app, router) {
  app.use(prepareScriptTags);
  router.get('/assets/js/__platform__.js', renderPlatformJs);
  router.get('/assets/js/__vendor__.js', renderVendorJs);
  router.get('/assets/js/__early__.js', renderEarlyJs);
  serverInit();
}

module.exports = setup;
