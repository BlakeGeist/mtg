'use strict';

const _ = require('lodash');
const fs = require('fs-promise');
const path = require('path');
const denodeify = require('denodeify');
const recursiveRead = denodeify(require('recursive-readdir'));

const INFO_CACHE = {};

function * stateMiddleware (next) {
  const _st = this.state;

  _.extend(_st, _.pick(_st.buildConfigs, 'languages', 'regions'));

  yield findPageInfo.call(this);
  yield next;
}

function assetType (asset) {
  if (asset === 'index.lang') return 'lang';
  if (asset === 'index.hbs') return 'template';
  if (asset === 'index.json') return 'config';
  if (asset === 'index_spec.json') return 'test';

  if (/^assets\/.+\.js$/.test(asset)) return 'js';
  if (/^assets\/.+\.less$/.test(asset)) return 'less';
  if (/^assets\//.test(asset)) return 'static';
  return 'unknown';
}

function * scanPageAssets (pageDir, pagePath, pageRelativeUrl) {
  const pageInfo = {};

  pageInfo.container = pageDir;
  pageInfo.path = pagePath;
  pageInfo.url = pageRelativeUrl;
  pageInfo.fullPath = path.resolve(pageDir, pagePath);

  const assets =
    (yield recursiveRead(pageInfo.fullPath))
      .map(asset => {
        const chunk = asset.replace(pageInfo.fullPath + '/', '');
        return {
          type: assetType(chunk),
          fullPath: asset,
          path: chunk
        };
      })
      .sort();

  pageInfo.assets = _.groupBy(assets, asset => asset.type);
  pageInfo.template = _.get(pageInfo, 'assets.template[0].fullPath');
  pageInfo.hasCustomCss = (pageInfo.assets.less || []).length > 0;

  this.state.page = pageInfo;

  INFO_CACHE[this.state.url.pathname] = pageInfo;
}

function * findPageInfo () {
  if (!this.state.variant) return;
  const places = [this.state.paths.contentPages, this.state.paths.dynamicPages];

  if (INFO_CACHE[this.state.url.pathname]) {
    this.state.page = INFO_CACHE[this.state.url.pathname];
    return;
  }
  const rel = this.state.relativeUrl;

  const relNoAssets = rel.replace(/(^|\/)assets\/.*$/, '');
  if (relNoAssets === '') {
    return yield scanPageAssets.call(this, this.state.paths.contentPages, 'index', relNoAssets);
  }

  const base = relNoAssets.split('/');
  if (base[base.length - 1] === '') base.pop();
  while (base.length) {
    const attempt = base.concat(['']).join('/');
    for (let i = 0; i < places.length; i++) {
      const place = places[i];
      const placePath = path.resolve(place, attempt);
      try {
        const indexHbsPath = path.resolve(placePath, 'index.hbs');
        const stat = yield fs.stat(indexHbsPath); // could use fs.exists but it's going away in newer node
        // technically we shouldn't have to ask for .isFile(), but i don't want
        // anyone to think that because 'stat' is an unused variable that the
        // fs.stat() call is useless
        if (stat.isFile()) {
          return yield scanPageAssets.call(this, place, attempt, relNoAssets);
        }
      } catch (e) {
        // console.log("WTF ERROR", e.stack);
      }

      const placeIndexPath = path.resolve(place, attempt, 'index');
      try {
        const indexHbsPath = path.resolve(placeIndexPath, 'index.hbs');
        const stat = yield fs.stat(indexHbsPath);
        if (stat.isFile()) {
          return yield scanPageAssets.call(this, place, attempt + '/index', relNoAssets);
        }
      } catch (e) {
        // console.log("WTF ERROR", e.stack);
      }
    }
    base.pop();
  }
}

function setup (app) {
  app.use(stateMiddleware);
}

module.exports = setup;
