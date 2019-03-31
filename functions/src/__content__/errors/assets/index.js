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
    $('[data-role=go-back]').on('click', function(event) {
      event.preventDefault();
      event.stopPropagation();
      site.commands.run('navigate:back');
    });
  }

})(window, window.site);
