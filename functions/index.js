const functions = require('firebase-functions');
const firebase = require('firebase');
const admin = require('firebase-admin');
const serviceAccount = require('./mtg-collections-firebase-adminsdk-lrp6i-b5f7ed798e.json');
const mtg = require('mtgsdk')


const _ = require('lodash');

const koa = require('koa');
const Router = require('koa-router');

const app = new koa();
const router = new Router();       // will be passed to components
app.component = n => component(n); // shortcut
const buildSettings = require('./src/backend/lib/build-settings');
const configs = require('./configs.json');
var rp = require('request-promise');

function component (name) {
  const _module = require('./src/backend/' + name);
  _module(app, router, configs);
  return app;
}

(app                             // App Configuration:
  .use(buildSettings)            // production build settings
  .component('sys/init')         // set up whitelabel & paths & initial this.state stuff
  .component('sys/render')       // adds this.renderTemplate()
  .component('sys/errors')       // error handling routes
  .component('sys/page-info')    // adds asset and page config data to this.state
  //.component('sys/data')         // sets up this.fetch() as an interface to api
  .component('sys/page-data')    // fetches data from api for content/dynamic pages
  .component('sys/etag')         // handles etags for everything other than page.js and page template renders
  .component('sys/assets')       // everything in the root /assets folder. this comes first because speed.
  .component('sys/slash')        // redirect page to page/
  .component('sys/main-css')     // compiles main.less to main.css
  .component('sys/handlebars')   // sets up handlebars for node and browser
  //.component('sys/healthcheck')  // health-check script
  .component('sys/scripts')      // renders <script> tags into dom
  .component('dynamic/routes')   // routes for specific dynamic pages
  .component('pages/css')        // css for both content and dynamic pages
  .component('pages/scripts')    // javascript for both content and dynamic pages
  .component('pages/handlebars') // renders content/dynamic pages that don't get handled by dynamic/routes
  //.component('pages/static')     // serves page-specific static assets
  .use(router.routes())          // enable the router after all other middlewares have run
  .use(router.allowedMethods())
);

exports.api = functions.https.onRequest(app.callback());


const database = admin.database();
var adminFirestore = admin.app().firestore();

var languages = [
  'ar','da','de','es','ja','fr','it','ko','pt','ru'
]

const cors = require('cors')({
  origin: true
});

//strings functions
const stringsModule = require('./strings');
exports.createString = functions.https.onRequest((req, res) => {
  stringsModule.handler(req, res);
});

exports.createSiteCollection = functions.https.onRequest((req, res) => {
    cors(req, res, () => {

      var collection = req.query.collectionName;
      var firstDoc = {
        name: 'first'
      }
      var newCollection = {
        collection: collection
      }

      newCollection[collection] = firstDoc

      db.collection('sites').doc('localhost').update(newCollection)
        .then(function() {
          res.status(200).send({collectionCreated: 'created ' + collection + ' in site localhost'});
          return
        })
        .catch(function(error) {
          res.status(500).send(error)
        });
    });
});

exports.importSets = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    const db = admin.app().firestore();
    var apiUrl = 'https://api.magicthegathering.io/v1/sets/'
    var options = {
        uri: apiUrl,
        headers: {
            'User-Agent': 'Request-Promise'
        },
        json: true // Automatically parses the JSON string in the response
    }

    rp(options)
      .then((response) => {
        var sets = response.sets
        _.each(sets, async function(set) {
          if(set){
            console.log(set)
            delete set.booster;
            await db.collection('sets').doc(set.code).set(set)
              .then(function() {
                return
              })
              .catch(function(error) {
                res.status(500).send(error)
              });
          }
        })
        res.status(200).send(response);

      })
      .catch(function (err) {
        res.status(500).send(error)
      });

  });
});

exports.importSet = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    const db = admin.app().firestore();

    var set = req.query.set;
    var apiUrl = 'https://api.magicthegathering.io/v1/sets/' + set
    var options = {
        uri: apiUrl,
        headers: {
            'User-Agent': 'Request-Promise'
        },
        json: true // Automatically parses the JSON string in the response
    }

    rp(options)
      .then((response) => {
        var set = response.set;
        if(set){
          console.log(set)
          delete set.booster;
          db.collection('sets').doc(set.code).set(set)
            .then(function() {
              res.status(200).send(response);
              return
            })
            .catch(function(error) {
              res.status(500).send(error)
            });
        } else {
          res.status(500).send(error)
        }

      })
      .catch(function (err) {
          // API call failed...
      });

  });
});

exports.importCardsFromSet = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    var set = req.query.set;
    var page = 1;
    if(getCardsBySetFromMtgApi(set, page)) {
      res.status(200).send('success!')
    } else{
      res.status(500).send('failed!')
    }
  });
});

function getMtgAPIOptions(set, page){
  var apiUrl = 'https://api.magicthegathering.io/v1/cards?set=' + set
  if (page) {
    apiUrl = apiUrl + '&page=' + page;
  }
  return {
      uri: apiUrl,
      headers: {
          'User-Agent': 'Request-Promise'
      },
      json: true // Automatically parses the JSON string in the response
  }
}

async function getCardsBySetFromMtgApi(set, page) {
  var again = true;

  while (again) {
    console.log('inside while')
    var options = getMtgAPIOptions(set, page);

    await rp(options)
      .then((response) => {
        var cards = response.cards;
        if(cards){
          _.each(cards, async function(card){
            console.log(card.name);
            if(card.multiverseid) {
              await sendCardToFireBase(card);
            }
          });
        }
        if(cards.length !== 100) {
          again = false;
        }
        page++;
      })
      .catch(function (err) {
          // API call failed...
      });
      console.log(again);
  }
  return true;
}


function sendCardToFireBase(card){
  const db = admin.app().firestore();
  db.collection('cards').doc(card.multiverseid.toString()).set(card)
    .then(function() {
      return
    })
    .catch(function(error) {
      res.status(500).send(error)
    });
}