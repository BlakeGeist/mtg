'use strict';

const _ = require('lodash');
// const configs = require('../../../configs.json');
const fs = require('fs-promise');
const logAndDefault = (desc, def, ctx) => error => { return def; };

const firebase = require('firebase');
const admin = require('firebase-admin');

var config = {
  apiKey: "AIzaSyCFFttw5MstJLbtxULo2QWe_jD_dqQ3ja0",
  authDomain: "mtg-collections.firebaseapp.com",
  databaseURL: "https://mtg-collections.firebaseio.com",
  projectId: "mtg-collections",
  storageBucket: "mtg-collections.appspot.com",
  messagingSenderId: "907098891785"
};

if(!firebase.apps.lenth){
  firebase.initializeApp(config);
}

if (!admin.apps.length) {
  var serviceAccount = require('../../../mtg-collections-firebase-adminsdk-lrp6i-b5f7ed798e.json');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://mtg-collections.firebaseio.com"
  });

}

const db = admin.app().firestore();

function * getPageData () {
  const pageData = {};

  const configFile = _.get(this.state, 'page.assets.config[0].fullPath');

  const config = configFile ? JSON.parse(yield fs.readFile(configFile, 'utf8')) : {};

  const promises = {};
  for (let k in config) {
    if (config[k].remote) {
      promises[k] = this.fetch(k, this.state.variant);
    } else {
      promises[k] = Promise.resolve(config[k]);
    }
  }

  try {
    _.extend(pageData, yield promises);
  } catch (e) {}
  _.extend(pageData, this.state.pageData);

  return pageData;
}

async function getFireDataItem(callTarget){
  const fireData = {};
  await db.collection(callTarget).limit(100)
    .get()
    .then(query=>{
        let data = query.docs.map(doc=>{
            let x = doc.data()
                x['_id']=doc.id;
                return x;
        })
        _.extend(fireData, data);
    })
    var formatted = _.indexBy(fireData, '_id');
  return formatted;
}

var fireSettings = async function getSiteSettings (varients, slug) {
  const fireData = {};
  await db.collection('sites').doc('localhost')
    .get()
    .then(doc=>{
      let data = doc.data();
      _.extend(fireData, data);
    })
  return fireData;
}

async function getUser (varients, slug) {
  var uid = this.cookies.get('__session=uid');
  var user = {};
  if(uid) {
    await admin.auth().getUser(uid)
      .then(function(userRecord) {
        // See the UserRecord reference doc for the contents of userRecord.
        //console.log('Successfully fetched user data:', userRecord.toJSON());
        _.extend(user, userRecord.toJSON());
      })
      .catch(function(error) {
        console.log('Error fetching user data:', error);
      });
  }
  return user;
}


async function getFirePageData (varients, slug) {
  var user = {test: 'test'};
  return user;

}

function * getAsyncFireMeta () {
  const asyncMeta = yield {
    fireData: yield getFireDataItem('cards'),
    fireStrings: yield getFireDataItem('strings'),
    fireProducts: yield getFireDataItem('products'),
    firePosts: yield getFireDataItem('posts'),
    fireSiteSettings: yield fireSettings()
  };
  return asyncMeta;
}

 var languages = {
  // TODO: Do these need to be translated? Moved to template?
  'da': 'Dansk',
  'de': 'Deutsch',
  'en': 'English',
  'es': 'Español',
  'fr': 'Français',
  'it': 'Italiano',
  'jp': '日本語',
  'kr': '한국어',
  'pt': 'Português',
  'ru': 'Русский',
  'ar': 'العربية'
};

function * getMeta () {
  const aMeta = {};
  const _st = this.state;
  const _wl = _st.whitelabelInfo;
  const meta = _.extend(
    {},
    aMeta,
    {
      lang: _st.translations,
      appIds: {
        facebook: _.get(_wl, 'oauth.facebook.clientID'),
        twitter: _.get(_wl, 'oauth.twitter.clientID'),
        google: _.get(_wl, 'oauth.google.clientID')
      },
      language: _st.language,
      region: _st.region,
      languages: _wl.settings.languages,
      currenciesEnabled: _wl.settings.currencies,
      defaultRegion: _wl.settings.defaultRegion,
      defaultLanguage: _wl.settings.defaultLanguage,
      defaultCurrency: _wl.settings.defaultCurrency,
      gvscLink: _.get(_st, 'configs.urls.gvscLink'),
      bspSavemateLink: _.get(_st, 'configs.urls.bspSavemateLink'),
      variant: _st.variant,
      whitelabel: _wl.slug,
      whitelabelRewards: _wl.settings.rewards,
      whitelabelText: _wl.name,
      whitelabelDomain: _wl.domain,
      whitelabelDomainFancy: _wl['domain-fancy'],
      whitelabelUrl: 'https://' + _wl.domain,
      whitelabelDomainOrg: _wl['domain-org'],
      whitelabelSocial: _wl.social,
      hasCustomFooter: _wl.hasCustomFooter,
      whitelabelSupport: _wl.support,
      whitelabelTrackingId: _wl.google.trackingId,
      whitelabelTrackingGoogleVerificationId: _wl.google.verificationId,
      whitelabelAddress: _wl.address,
      whitelabelBlogLink: _wl.blogLink,
      currentPageUrl: _.get(_st, 'page.url'),
      currentPageCss: _.get(_st, 'page.hasCustomCss') || false,
      currentPageRelativeUrl: _.get(_st, 'relativeUrl'),
      currentPageCanonicalUrl: _.get(_st, 'canonicalUrl'),
      env: _st.env,
      dev: _st.env === 'dev',
      stripeKey: _.get(_st, 'configs.paymentGateways.stripe.api_key'),
      scriptTags: _.get(_st, 'SCRIPTS'),
      key: _.get(_st, 'configs.jwt'),
      hostname: _st.hostname
    }
  );

  return meta;
}

function * getTemplateArguments (extend) {
  const _st = this.state;
  const fireMeta = yield getAsyncFireMeta.call(this);
  const fireUser = yield getUser.call(this);
  const firePageData = yield getFirePageData.call(this);
  const data = yield {
    meta: this.getMeta(this),
    fireBaseData: fireMeta.fireData,
    siteSettings: fireMeta.fireSiteSettings
  };

  const tplArgs = {
    proposals: data.meta.proposals,
    whitelabel: {
      name: data.meta.whitelabelText // had to add this now that whitelabel.name is happening via reprocess
    },
    data: firePageData,
    fireBaseData: fireMeta.fireData,
    strings: fireMeta.fireStrings,
    products: fireMeta.fireProducts,
    posts: fireMeta.firePosts,
    siteSettings: fireMeta.fireSiteSettings,
    fireUser: fireUser,
    settings: {
      region: data.meta.region,
      language: data.meta.language,
      defaultRegion: data.meta.defaultRegion,
      defaultLanguage: data.meta.defaultLanguage,
      defaultCurrency: data.meta.defaultCurrency,
      languages: languages, // this is only a list of language codes. real language data is in lang.languages
      variant: data.meta.variant,
      vipPrices: data.meta.vipPrices,
      wl: data.meta.whitelabel,
      wlText:data.meta.whitelabelText,
      rewards:data.meta.whitelabelRewards,
      partnerLogo: data.meta.whitelabel,
      wlDomain: data.meta.whitelabelDomain,
      wlDomainFancy: data.meta.whitelabelDomainFancy,
      wlUrl: data.meta.whitelabelUrl,
      wlDomainOrg: data.meta.whitelabelDomainOrg,
      wlInvestorRelations: data.meta.investorRelations,
      wlSocial: data.meta.whitelabelSocial,
      hasCustomFooter: data.meta.hasCustomFooter,
      wlSupport: data.meta.whitelabelSupport,
      stripeKey: data.meta.stripeKey,
      wlTrackingId: data.meta.whitelabelTrackingId,
      wlTrackingGoogleVerificationId: data.meta.whitelabelTrackingGoogleVerificationId,
      wlAddress: data.meta.whitelabelAddress,
      wlBlogLink: data.meta.whitelabelBlogLink,
      api: data.meta.api,
      appIds: data.meta.appIds,
      contactsAppIds: data.meta.contactsAppIds,
      env: data.meta.env,
      dev: data.meta.dev,
      currencies: data.meta.currencies,
      currenciesEnabled: data.meta.currenciesEnabled, // this is only a list of currencies codes. real currencies data is in lang.languages
      key: data.meta.key, //key to decrypt emails
      hostname: data.meta.hostname
    },
    pageSettings: {
      url: data.meta.currentPageUrl,
      css: data.meta.currentPageCss,
      relativeUrl: data.meta.currentPageRelativeUrl,
      canonicalUrl: data.meta.currentPageCanonicalUrl
    },
    globals: {
      regions: data.meta.regions,
      currencies: data.meta.currencies,
      contextTime: getContextTime((this.state.env === 'dev' ? 3 : 30) * 60 * 1000), // context is "fresh" for 30 mins on prod and 3 mins on dev
      buildTime: this.state.buildSettings.buildTime,
      buildId: this.state.buildSettings.buildId,
      variant: this.state.variant ? this.state.variant.desc : this.state.whitelabel + '/global',
      htmlElementClass: this.query.i ? 'is-iframe' : null,
      scriptTags: data.meta.scriptTags,
      regions: data.meta.regions,
      languages: languages
    }
  };
  return tplArgs;
}

function getContextTime (interval) {
  return Math.floor(Date.now() / interval) * interval;
}


function setup (app) {
  app.use(function * (next) {
    this.getMeta = getMeta;
    this.getTemplateArguments = getTemplateArguments;
    yield next;
  });
}

module.exports = setup;
