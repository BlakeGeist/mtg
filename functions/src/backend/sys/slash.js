'use strict';

const qs = require('querystring');

module.exports = function setup (app, router) {
  app.use(function * (next) {
    const url = this.url.replace(/\?.*$/, '');
    let append = "";
    var cfRegion,browserLocale,region,lang;
    if (Object.keys(this.query).length) {
      append += '?' + qs.stringify(this.query);
    }

    // handle the root / route -- redirect to /:region/:language/
    if (url === '/') {

       cfRegion = getCfCountry.call(this);
       browserLocale = parseBrowserLocale.call(this);
       region = (this.cookies.get('defaultRegion') || cfRegion || browserLocale.region || this.state.defaultRegion || 'us').toLowerCase();
        lang = (this.cookies.get('defaultLanguage') || browserLocale.language || this.state.defaultLanguage || 'en').toLowerCase();

        if(lang != 'ru' && lang != 'pt' && lang != 'it' && lang != 'fr' && lang != 'es' && lang != 'de' && lang != 'da' && lang != 'kr' && lang != 'jp' && lang != 'ar'){
           lang = 'en'
        }

      return this.redirect('/' + region + '/' + lang + '/' + append);
    }

    // handle pages that are missing a trailing slash
    if (url.indexOf('.') === -1 && url[url.length - 1] !== '/') {
      return this.redirect(url + '/' + append);
    }

    yield next;
  });
};

function getCfCountry () {
  const val = this.get('cf-ipcountry');
  if (!val || val === 'xx') return null;
  return val;
}

const langDashReg = /^\w{2}-\w{2}$/;
const dashReg = /-\w{2}$/;
const langDash = /^\w{2}-/;
function parseBrowserLocale () {
  const accepts = this.acceptsLanguages().filter(x => x !== '*');
  const language = accepts.map(x => x.replace(dashReg, ''))[0] || null;
  const region = accepts.filter(x => langDashReg.test(x)).map(x => x.replace(langDash, ''))[0] || null;
  //console.log(">>>>>"+accepts);
  //console.log(">>>>>"+language);
  //console.log(">>>>>"+region);
  return {
    language: language,
    region: region
  };

}
