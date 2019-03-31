'use strict';

const _ = require('lodash');
const path = require('path');
const fs = require('fs-promise');
const co = require('co');
const mkdirp = require('mkdirp-promise');
const configs = require('../../../configs');
const denodeify = require('denodeify');
// const utils = require('ominto-utils');
const redis = require('redis');
const crypto = require('crypto');
const jsonStableStringify = require('json-stable-stringify');

const cacheDir = (/^dev/.test(process.env.NODE_ENV)) ? path.resolve(__dirname, '../../../.cache') : '/tmp/site-frontend-cache';

const md5 = d => crypto.createHash('md5').update(d).digest('hex');

const redisClient = getRedisClient(configs);

/* eslint-disable key-spacing */
const debug = {
  ALL    : require('debug')('backend:lib:three-way-cache'),
  memory : require('debug')('backend:lib:three-way-cache:memory'),
  file   : require('debug')('backend:lib:three-way-cache:file'),
  redis  : require('debug')('backend:lib:three-way-cache:redis')
};
/* eslint-enable */

const MEMORY_BACKING = Object.create(null);
const caches = {
  memory: {
    get: function * (key, ttl, cacheName) {
      debug.memory('[MEMORY : GET] ' + key + '/' + cacheName);
      if (!MEMORY_BACKING[cacheName]) MEMORY_BACKING[cacheName] = Object.create(null);
      const cached = MEMORY_BACKING[cacheName][key];
      if (cached) {
        if (ttl > Date.now() - cached.when) {
          return cached.val;
        } else {
          delete MEMORY_BACKING[cacheName][key];
        }
      }
      return false;
    },
    remove: function * (key, ttl, cacheName) {
      debug.memory('[MEMORY : REMOVE] ' + key + '/' + cacheName);
      delete MEMORY_BACKING[cacheName][key];
    },

    set: function * (key, val, ttl, cacheName) {
      debug.memory('[MEMORY : SET] ' + key + '/' + cacheName);
      if (!MEMORY_BACKING[cacheName]) MEMORY_BACKING[cacheName] = Object.create(null);
      MEMORY_BACKING[cacheName][key] = {val: val, when: Date.now()};
    }
  },
  file: {
    get: function * (key, ttl, cacheName) {
      debug.file('[FILE : GET] ' + key + '/' + cacheName);
      const _path = path.resolve(cacheDir, cacheName, key);
      try {
        const stat = yield fs.stat(_path);
        if (ttl > Date.now() - stat.mtime.toTime()) {
          return yield fs.readFile(_path).then(x => JSON.parse(x));
        } else {
          yield fs.unlink(_path);
        }
      } catch (e) {}
      return false;
    },
    remove: function * (key, ttl, cacheName) {
      debug.file('[FILE : REMOVE] ' + key + '/' + cacheName);
      const _path = path.resolve(cacheDir, cacheName, key);
      yield fs.unlink(_path);
    },
    set: function * (key, val, ttl, cacheName) {
      debug.file('[FILE : SET] ' + key + '/' + cacheName);
      const _dir = path.resolve(cacheDir, cacheName);
      yield mkdirp(_dir);
      const _path = path.resolve(cacheDir, cacheName, key);
      yield fs.writeFile(_path, JSON.stringify(val));
    }
  },
  redis: {
    get: function * (key, ttl, cacheName) {
      debug.redis('[REDIS : GET] ' + key + '/' + cacheName);
      const redisKey = [cacheName, key].join('::');
      return JSON.parse(yield redisClient.$get(redisKey));
    },
    remove: function * (key, ttl, cacheName) {
      debug.file('[REDIS : REMOVE] ' + key + '/' + cacheName);
      const redisKey = [cacheName, key].join('::');
      // const _path = path.resolve(cacheDir, cacheName, key);
      yield redisClient.$del(redisKey);
    },
    set: function * (key, val, ttl, cacheName) {
      debug.redis('[REDIS : SET] ' + key + '/' + cacheName);
      const redisKey = [cacheName, key].join('::');
      yield redisClient.$setex(redisKey, ttl / 1000 | 0, JSON.stringify(val)); // redis ttls are in seconds
    }
  }
};

function cache (func, cacheName, opts) {
  //if (!opts.order) opts.order = ['memory', 'redis', 'file'];
  if (!opts.order) opts.order = ['redis'];
  const promises = {};

  if (process.env.WHITELABEL) {
    cacheName = cacheName + '-' + process.env.WHITELABEL;
  }

  return co.wrap(function * cacheableFunc () {
    const A = _.toArray(arguments);
    const K = md5(jsonStableStringify(A));

    if (promises[K]) return yield promises[K];

    debug.ALL('Cacheable call: ', K, jsonStableStringify(A));

    for (let i = 0; i < opts.order.length; i++) {
      const type = opts.order[i];
      const ttl = opts[type];
      if (ttl) {
        try {
          const cachedVal = yield caches[type].get(K, ttl, cacheName);
          debug.ALL([type, cacheName, K].join(':') + ' ' + (cachedVal ? 'hit' : 'miss'));

          if (cachedVal) return cachedVal;
        } catch (e) {
          debug.ALL('Cache read caused error', e.stack);
          yield caches[type].remove(K, ttl, cacheName);
        }
      }
    }
    debug.ALL('no cache found for ' + K + ' in ' + cacheName);

    promises[K] = func.apply(this, A);
    let err;
    const val = yield promises[K].catch(e => err = e);
    delete promises[K];

    if (err) {
      throw err; // now let the error propagate
    } else if (val) {
      try {
        debug.ALL('caching value for ' + K + ' in ' + cacheName);
        for (let i = 0; i < opts.order.length; i++) {
          const type = opts.order[i];
          const ttl = opts[type];
          if (ttl) {
            debug.ALL('ATTEMPTING TO CACHE ' + K + ' in ' + cacheName + ' using ' + type);
            yield caches[type].set(K, val, ttl, cacheName);
          }
        }
      } catch (e) {
        debug.ALL('Cache write caused error', e.stack);
      }
    }
    return val;
  });
}

function getRedisClient (configs) {
  const cfg = configs.dataStore.redis.writer;
  const client = redis.createClient(cfg.port, cfg.host, {auth_pass: cfg.auth});
  client.$setex = denodeify(client.setex.bind(client));
  client.$get = denodeify(client.get.bind(client));
  return client;
}

module.exports = cache;
