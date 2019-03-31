'use strict';

const _ = require('lodash');
const co = require('co');
const debug = require('debug')('backend:sys:data');
const request = require('request-promise');
const threeWayCache = require('../lib/three-way-cache');
const buildSettings = require('../lib/build-settings').buildSettings;
const wait = require('co-waiter');

module.exports = setup;


const apiCacheConfig = (/^dev/.test(process.env.NODE_ENV)) ? {
  order: ['redis'],
  redis: 0
} : {
  order: ['redis'],
  redis: 0
};

const CACHER_CACHE = {};
function getCacher (key, data) {
  if (!CACHER_CACHE[key]) {
    CACHER_CACHE[key] = threeWayCache(data.get.bind(data), 'api/' + key, apiCacheConfig);
  }
  return CACHER_CACHE[key];
}

function cacherKey (ctx) {
  var k = [
    _.get(ctx, 'state.whitelabel') || '_whitelabel_',
    _.get(ctx, 'state.variant.desc') || '_desc_',
    _.get(ctx, 'hostname') || '_hostname_',
    _.get(buildSettings, 'buildId') || '_buildId_'
  ].join('.').replace(/[^a-zA-Z0-9._-]/g, '_');
  return k;
}

function setup (app) {
  app.use(function * (next) {
    const data = getData();
    this.fetch = getCacher(cacherKey(this), data);
    yield next;
  });
}

const firebase = require('firebase');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  var serviceAccount = require('../../../mtg-collections-firebase-adminsdk-lrp6i-b5f7ed798e.json');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://mtg-collections.firebaseio.com"
  });

}

var adminAuth = admin.app().auth();

const db = admin.app().firestore();

function getData () {
  const getKey = key => resp => _.get(resp, 'body.' + key);
  const _DATA = {};
  _DATA._fetchers = {

  };

  _DATA.get = co.wrap(function * (type) {
    var fetcher = _DATA._fetchers[type];
    var rest = _.toArray(arguments).slice(1);
    debug('fetching ' + type + ' : ' + JSON.stringify(rest));
    if (!fetcher) throw new Error('No remote data fetcher defined for ' + type);
    return yield fetcher.apply(null, rest);
  });

  return _DATA;
}
