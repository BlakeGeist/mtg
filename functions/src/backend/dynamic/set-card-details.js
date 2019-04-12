'use strict';

const _ = require('lodash');
const admin = require('firebase-admin');
const db = admin.app().firestore();


// const path = require('path');

async function middleware (ctx, next) {

}

setup.middleware = function * (next) {
  const path = _.get(this.state, 'page.url');
  if (!path || path.indexOf('card/') == -1) return yield next;

  const urlSplit = this.state.relativeUrl.split('/');

  const set = urlSplit[1];
  const slug = urlSplit[3];

  var data = {}

  yield db.collection('sets').doc(set).get()
    .then(async (response) => {
      data = response.data();
      await db.collection('cards').where("set", "==", set).where("slug", "==", slug).get()
        .then((querySnapshot) => {
          var payload = {}
          querySnapshot.forEach(function(doc) {
              // doc.data() is never undefined for query doc snapshots
              payload = doc.data();
          });
          data.card = payload;
        })
        .catch(function(error) {
        });

    })
    .catch(function(error) {
      res.status(500).send(error)
    });

  this.state.firePageData = data;

  this.body = yield this.renderTemplate('dynamic:card');
  this.type = 'text/html';
};

function setup (app, router) {
  return async function (ctx, next) {
    app.use(middleware);

  }
}

module.exports = setup;
