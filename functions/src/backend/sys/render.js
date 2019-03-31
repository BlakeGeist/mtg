'use strict';

const _ = require('lodash');
const Handlebars = require('handlebars');
const fs = require('fs-promise');
const path = require('path');

const tplCache = {};

const IS_DYNAMIC = /^dynamic:/;
const IS_CONTENT = /^content:/;

function * renderTemplate (tplPath, tplArgs, options) {
  if (!options) options = {};

  if (IS_DYNAMIC.test(tplPath)) {
    tplPath = path.resolve(this.state.paths.dynamicPages, tplPath.replace(IS_DYNAMIC, ''), 'index.hbs');
  } else if (IS_CONTENT.test(tplPath)) {
    tplPath = path.resolve(this.state.paths.contentPages, tplPath.replace(IS_CONTENT, ''), 'index.hbs');
  }

  // create alternative template path for whitelabel-specific template
  var startSpliceIndex = tplPath.length - 4; // 4 chars = .hbs
  var altTplPath = tplPath.slice(0, startSpliceIndex) + '-' + this.state.whitelabel + tplPath.slice(startSpliceIndex);

  // add whitelabel template to cache if available, else cache default index.hbs
  let chosenPath = tplPath;
  _.each([altTplPath, tplPath], path => {
    if (!tplCache[path]) {
      if (fs.existsSync(path)) {
        chosenPath = path;
        const tplSrc = fs.readFileSync(chosenPath, 'utf8');
        tplCache[chosenPath] = Handlebars.compile(tplSrc);
        return false;
      }
    }
  });

  if (!tplArgs) {
    tplArgs = yield this.getTemplateArguments();
  }
  const data = tplCache[chosenPath](tplArgs);

  return data;
}

function setup (app, router) {
  app.use(function * (next) {
    this.renderTemplate = renderTemplate;
    yield next;
  });
}

module.exports = setup;
