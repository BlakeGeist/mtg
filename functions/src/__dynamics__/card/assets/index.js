'use strict';

(function(window, site) {

  var E = site.events;
  var C = site.commands;
  var H = site.helpers;

  preDomReady();

  function preDomReady(){
    initEvents();

    const slug = site.context.pageSettings.relativeUrl.replace('set/', '').replace(/\/.*$/, '');
    var payload = {
      set: slug
    }
    //C.run('api:getSetBySlug', payload);
  }

  function initEvents(){
    E.on('global:ready', ready);
    //E.on('api:complete:getSetBySlug', setContext);
  }

  function ready() {

  }

  function setContext(data){
    var payload = data.responseJSON;
    site.context.firePageData = payload;

    _.each(payload.cards, function(card){
      var template = H.renderPartial('card', {
        card: card
      })

      $('.cards').append(template)

    })

  }

})(window, window.site);
