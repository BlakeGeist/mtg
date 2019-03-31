'use strict';

const _ = require('lodash');
const co = require('co');
const fs = require('fs-promise');
const path = require('path');
const less = require('less');
const squish = require('../lib/squish');
const configs = require('../../../configs.json');
const bufferFrom = require('buffer-from');

const MAIN_CSS_CACHE = {};

async function renderCss (cssFile) {

  if(this && this.state) {
    const WL = _.get(process.env, 'WHITELABEL_FOR_LESS') || this.state.whitelabel;
    if (!MAIN_CSS_CACHE[WL]) MAIN_CSS_CACHE[WL] = {};
    if (!MAIN_CSS_CACHE[WL][cssFile]) {
      const lessRoot = path.resolve(this.state.paths.root, 'less');
      const lessMainOverride = path.resolve(lessRoot, 'whitelabel', WL, cssFile);
      const lessMain = path.resolve(lessRoot, cssFile);

      let useOverride = false;
      try {
        const overStat = await fs.stat(lessMainOverride);
        if (overStat && overStat.isFile()) {
          useOverride = true;
        }
      } catch (e) {
        // do nothing; file didnt exist
      }

      const lessFile = useOverride ? lessMainOverride : lessMain;

      let lessString = '';
      lessString += '@whitelabel: \'' + WL + '\';\n';
      lessString += await fs.readFile(lessFile, 'utf8');

      try {
        const out = await less.render(lessString, {
          filename: lessMain,
          paths: [lessRoot],
          compress: squish.squishable
        });

        MAIN_CSS_CACHE[WL][cssFile] = new Buffer.from(out.css);
      } catch (e) {
        console.error(e);
      }
    }

    this.body = MAIN_CSS_CACHE[WL][cssFile];
    this.type = 'text/css';
  }

}

async function mainCss (ctx) {
  await renderCss.call(ctx, 'main.less');
}

async function coreCss () {
  await renderCss.call(this, 'core.less');
}

async function fillCaches () {
  await _.flatten(Object.keys(configs.whitelabel)
    .filter(k => k !== 'defaults')
    .map(whitelabel => {
      const ctx = {
        state: {
          whitelabel: whitelabel,
          paths: global.PATHS
        }
      };
      console.log('Pre-caching main.css and core.css for ' + whitelabel);
      return [
        co(mainCss.bind(ctx)),
        co(coreCss.bind(ctx))
      ];
    }));
}

function serverInit () {
  if (!squish.squishable) return;
  co(fillCaches)
    .then(() => console.log('Pre-Cached concatenated main/core css files!'))
    .catch(e => console.error('Error during css pre-cache operation', e.stack));
}

function setup (app, router) {
  serverInit();
  router.get('/assets/css/main.css', mainCss);
  router.get('/assets/css/core.css', coreCss);
}

module.exports = setup;
