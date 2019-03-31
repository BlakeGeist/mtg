/* global _, $ */
(function (window, site) {
  'use strict';

  var _storage = site.storage;
  var _keys = site.keys;
  var C = site.commands;
  var E = site.events;
  var H = site.helpers;
  var POST_AUTH_REDIRECT = _keys.postAuthRedirect;
  var POST_AUTH_OVERRIDE = _keys.postAuthOverride;

  preDomReady();

  function preDomReady(){
    initEvents()
  }

  function initEvents(){
  }

})(window, window.site);
