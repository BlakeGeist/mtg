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
    E.on('api:complete:updateSet', handleSetUpdateResponse);
  }

  function ready() {
    $(document).on('click', '[data-edit-set]', function(e){
      H.stopEvents(e);
      var slug = $(this).data('edit-set');
      var set = site.context.firePageData;

      console.log(set)

      C.run('modal:open', 'edit-set', {
        set: set
      })
    });
  }

  function handleSetUpdateResponse(xhr){
    location.reload();
  }

})(window, window.site);
