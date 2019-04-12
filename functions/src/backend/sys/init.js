'use strict';

const _ = require('lodash');
const path = require('path');
const urlLib = require('url');
//const utils = require('ominto-utils');
const querystring = require('querystring');

function mergeWhitelabelInfo(cfg, defaults) {
  return _.extend({}, defaults, cfg, function(cur, val) {
    if (_.isString(val)) return val;
    if (_.isArray(val)) return val;
    if (_.isObject(val)) return _.extend({}, cur, val);
    return val;
  });
}

function whitelabelInfoByDomain(configs, domain) {
  const W = configs.whitelabel;
  const list = Object.keys(W).filter(x => x !== 'defaults');
  for (let i = 0; i < list.length; i++) {
    const entry = W[list[i]];
    const alts = entry['domain-alts'] || [];
    if (entry.domain === domain || alts.indexOf(domain) > -1) {
      return mergeWhitelabelInfo(entry, W.defaults);
    }
  }

  return null;
}

function whitelabelInfoByName(configs, name) {
  const W = configs.whitelabel;
  if (W[name]) return mergeWhitelabelInfo(W[name], W.defaults);

  return null;
}

const PATHS = {};
PATHS.package = path.resolve(__dirname, '../../..');
PATHS.src = path.resolve(PATHS.package, 'src');
PATHS.root = path.resolve(PATHS.src, '__root__');
PATHS.contentPages = path.resolve(PATHS.src, '__content__');
PATHS.dynamicPages = path.resolve(PATHS.src, '__dynamics__');
PATHS.configs = path.resolve(PATHS.package, 'configs.json');
global.PATHS = PATHS;
const configs = require(PATHS.configs);

function * middleware (next) {

  const _st = this.state;
  const hostname = this.hostname;
  _st.url = urlLib.parse(this.url);
  _st.paths = PATHS;
  _st.hostname = hostname;

  _st.hostname = _st.hostname.replace(/\./g, '-');

  let qs;
  if (_st.url.query) {
    qs = querystring.parse(_st.url.query);
  }

  _st.env = process.env.NODE_ENV;
  _st.isDev = !!(/^dev/.test(_st.env));
  _st.isProd = !_st.isDev;

  let info = whitelabelInfoByName(configs, 'black');
  if (!info) throw new Error('NO WHITELABEL FOUND AND OMINTO DOESNT EVEN EXIST?');

  _st.whitelabel = info.slug;
  _st.whitelabelInfo = info;
  _st.configs = configs;
  _st.cobrand = qs ? qs.cb : null;
  _st.queryString = qs;
  _st.defaultRegion = _.get(info, 'settings.defaultRegion');
  _st.defaultLanguage = _.get(info, 'settings.defaultLanguage');
  _st.defaultCurrency = _.get(info, 'settings.defaultCurrency', 'usd');

  const url = _st.url.pathname.replace(/^\//, '').split('/');
  if (url.length > 2 && url[0].length === 2 && url[1].length === 2) {
    _st.region = url[0];
    _st.language = url[1];
    _st.variant = {
      region: _st.region,
      language: _st.language,
      whitelabel: _st.whitelabel,
      cobrand: _st.cobrand,
      desc: [_st.whitelabel, _st.region, _st.language].join('/')
    };
    _st.relativeUrl = (_st.url.pathname
      .replace('/' + _st.region + '/' + _st.language + '/', '/')
      .replace(/\/assets\/.+$/, '/') // specifically to fix assets/page.js, but probably good to do no matter what
      .replace(/^\//g, ''));

    _st.canonicalUrl = [
      'https://' + (_.get(info, 'settings.domain') || info.domain),
      _st.region || _.get(info, 'settings.defaultRegion'),
      _st.language || _.get(info, 'settings.defaultLanguage'),
      _st.relativeUrl
    ].join('/');

    //if the canonicalUrl contains a number/ remove it
    if(_st.canonicalUrl.match(/\d+/g)){
      // rmeove the number from the cononical url
      _st.canonicalUrl = _st.canonicalUrl.replace(/\d+/g, "");
    }

    //if the conocialUrl contains a // remove one of the slashes
    if(_st.canonicalUrl.endsWith("//")){
      // remove the extra slash in the conocial url
      _st.canonicalUrl = _st.canonicalUrl.slice(0, -1);
    }

    this.set('Content-Language', _st.language + '-' + _st.region);
  }

  _st.pageData = {}; // any middleware can add to this
  _st.siteSettings = {}; // any middleware can add to this


  yield next;
}

function setup (app, router) {
  app.use(middleware);
}

module.exports = setup;
