/* global $ */
'use strict';

(function (window, site) {

  var H = site.helpers;
  var C = site.commands;
  var E = site.events;
  var CONTEXT = site.context;

  preDomReady();

  function preDomReady(){
    initEvents();
  }

  function initEvents(){
    E.on('global:ready', ready);
  }

  function ready () {
    var template = H.renderPartial('account-info', site.context.fireUser)
    //$('main').prepend(template);
  }

})(window, window.site, window.jQuery);
