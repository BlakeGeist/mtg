/* global site */
(function (html, window, search, hash, get, high, low, auth, token, htoken) {
  'use strict';

  var mod = function (action, arg) { html.className = html.className.split(' ')[action](arg).join(' '); };
  var add = function (cl) { mod('concat', [cl]); };
  var remove = function (cl) { mod('filter', function (x) { return x !== cl; }); };
  var toggle = function (cond, cl) { (cond ? add : remove)(cl); };

  var config = {
    apiKey: "AIzaSyCFFttw5MstJLbtxULo2QWe_jD_dqQ3ja0",
    authDomain: "mtg-collections.firebaseapp.com",
    databaseURL: "https://mtg-collections.firebaseio.com",
    projectId: "mtg-collections",
    storageBucket: "mtg-collections.appspot.com",
    messagingSenderId: "907098891785"
  };
  firebase.initializeApp(config);

  try {
    window.site = {};

  } catch (e) {
    return false;
  }
})(document.documentElement, window, window.location.search, window.location.hash, window.localStorage && window.localStorage.getItem.bind(window.localStorage), 'high', 'low', 'Site.X-Auth-', 'Token', 'Site.historic-user');
