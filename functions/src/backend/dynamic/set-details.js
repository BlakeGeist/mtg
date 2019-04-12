'use strict';

const _ = require('lodash');
const admin = require('firebase-admin');
const db = admin.app().firestore();


// const path = require('path');

async function middleware (ctx, next) {

}

setup.middleware = function * (next) {
  const path = _.get(this.state, 'page.path');
  if (!path || path.indexOf('set/') !== 0) return yield next;
  const slug = this.state.relativeUrl.replace('set/', '').replace(/\/.*$/, '');

  var data = {}

  yield db.collection('sets').doc(slug).get()
    .then(async (response) => {
      data = response.data();
      await db.collection('cards').where("set", "==", slug).limit(50).get()
        .then((querySnapshot) => {
          var payload = []
          querySnapshot.forEach(function(doc) {
              // doc.data() is never undefined for query doc snapshots
              payload.push(doc.data())
          });
          data.cards = payload

        })
        .catch(function(error) {
        });

    })
    .catch(function(error) {
      res.status(500).send(error)
    });

  this.state.firePageData = data;


  this.body = yield this.renderTemplate('dynamic:set');
  this.type = 'text/html';
};

function setup (app, router) {
  return async function (ctx, next) {
    app.use(middleware);

  }
}

module.exports = setup;
