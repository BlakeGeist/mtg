'use strict';

(function(window, site) {

  var E = site.events;
  var C = site.commands;
  var H = site.helpers;

  preDomReady();

  function preDomReady(){
    initEvents();
  }

  function initEvents(){
    E.on('global:ready', ready);
  }

  function ready() {}

})(window, window.site);
