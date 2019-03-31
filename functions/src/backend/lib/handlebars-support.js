'use strict';

const Handlebars = require('handlebars');
const fs = require('fs-promise');
const co = require('co');
const path = require('path');
const denodeify = require('denodeify');
const recursiveRead = denodeify(require('recursive-readdir'));
const recursiveReadSync = require('recursive-readdir-sync');
const Swag = require('swag');

const packageRoot = path.resolve(__dirname, '../../..');
const srcRoot = path.resolve(packageRoot, 'src/__root__');
const viewsRoot = path.resolve(srcRoot, 'views');
const helpersRoot = path.resolve(viewsRoot, 'helpers');
const partialsRoot = path.resolve(viewsRoot, 'partials');
const templatesRoot = path.resolve(viewsRoot, 'templates');

const partialsPre = [
  '(function(window, site, Handlebars) {',
  '  var template = Handlebars.template;',
  '  site.partials = {'
];

const partialsPost = [
  '  }',
  '  for (var k in site.partials) Handlebars.registerPartial(k, site.partials[k]);',
  '})(window, window.site, window.Handlebars);'
];

function * renderHelpers () {
  console.log(helpersRoot);
  const paths = yield recursiveRead(helpersRoot);
  const out = [];
  for (let i = 0; i < paths.length; i++) {
    const name = paths[i].replace(helpersRoot + '/', '').replace(/\.js$/, '');
    const src = require(paths[i]).toString(); // not async but will only happen once because node will cache it for us
    out.push('Handlebars.registerHelper(' + JSON.stringify(name) + ', ' + src + ');');
  }
  return '(function(Handlebars){ ' + out.join('\n\n') + '}).call(this, Handlebars);';
}

function * renderPartials () {
  const paths = [].concat.apply([], yield [
    recursiveRead(partialsRoot),
    recursiveRead(templatesRoot)
  ]);

  const chunks = ['    "_": "_"'].concat(yield paths.map(_path => {
    return fs
      .readFile(_path, 'utf8')
      .then(data => {
        const key = _path.replace(viewsRoot + '/', '').replace(/\.hbs$/, '');
        return '"' + key + '": template(' + Handlebars.precompile(data) + ')';
      });
  }));


  return [].concat(partialsPre, [chunks.join(',\n    ')], partialsPost).join('\n');
}

function * renderAll () {
  return yield {
    helpers: renderHelpers(),
    partials: renderPartials()
  };
}

function serverSideSetup () {
  Swag.registerHelpers(Handlebars);
  const files = recursiveReadSync(viewsRoot);
  files.forEach(function (file) {
    const rel = file.replace(viewsRoot + '/', '');
    if (/^helpers\//.test(rel)) {
      const name = rel.replace('helpers/', '').replace(/\.js$/, '');
      Handlebars.registerHelper(name, require(file));
    } else if (/^(partials|templates)\//.test(rel)) {
      const name = rel.replace(/\.hbs$/, '');
      Handlebars.registerPartial(name, fs.readFileSync(file, 'utf8'));
    }
  });
}

module.exports = {
  renderPartials: co.wrap(renderPartials),
  renderHelpers: co.wrap(renderHelpers),
  renderAll: co.wrap(renderAll),
  serverSideSetup: serverSideSetup
};
