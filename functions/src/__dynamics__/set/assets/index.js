'use strict';

(function(window, site) {

  var E = site.events;

  preDomReady();

  function preDomReady(){
    initEvents();
  }

  function initEvents(){
    E.on('global:ready', ready);
  }

  function ready() {
    alert('here');
  }

})(window, window.site);
