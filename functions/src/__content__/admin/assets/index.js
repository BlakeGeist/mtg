/* global $ */
'use strict';

(function (window, site) {

  var H = site.helpers;
  var C = site.commands;
  var E = site.events;
  var CONTEXT = site.context;
  var USER;

  preDomReady();

  function preDomReady(){
    initEvents();
  }

  function initEvents(){
    E.on('global:ready', ready);
    E.on('me:loggedIn', userCheck);
    E.on('api:complete:importCardsFromSet', handleImportCardsFromSet);
    E.on('api:complete:updateSet', handleImportCardsFromSet);
  }

  function userCheck() {
    USER = site.context.userData2;
    if(USER){
      //C.run('navigate:home');
    }
  }

  function ready(){

    $(document).on('click', '[data-update-set="toggleActive"]', function(e){
      H.stopEvents(e);
      var currentTruth = $.parseJSON($(this).text());
      var targetSet = $(this).closest('[data-set]').data('set');
      var toggledTruth = !currentTruth;
      var payload = {
        isActive: toggledTruth,
        set: targetSet
      }
      C.run('api:updateSet', payload);
    });

    $(document).on('click', '[data-import-set]', function(e){
      H.stopEvents(e);
      var payload = {
        set: $(this).data('import-set')
      }
      C.run('api:importCardsFromSet', payload);
    });

    $(document).on('submit', '[data-form-add="collection"]', function(event) {
      H.stopEvents(event);
      var formData = H.getFormData(this);
      console.log(formData);
      if(!formData.collectionName){
        alert('enter a collection name');
        return;
      }
      C.run('api:create:collection', formData);
    });

    $(document).on('submit', '[data-string]', function(e){
      H.stopEvents(e);
      var formData = H.getFormData(this);
      C.run('api:create:string', formData);
    });

    $(document).on('click', '[data-edit-string]', function(e){
      H.stopEvents(e);
      var slug = $(this).data('edit-string');
      var strings = site.context.strings;
      var string = strings[slug];
      const ordered = {};
      Object.keys(string).sort().forEach(function(key) {
        ordered[key] = string[key];
      });

      C.run('modal:open', 'edit-string', {
        string: ordered
      })
    });

    $(document).on('submit', '[data-strings-edit]', function(e){
      H.stopEvents(e);
      var formData = H.getFormData(this);
      console.log(formData);
    })
  }

  function handleImportCardsFromSet(xhr){
    location.reload();
  }

})(window, window.site, window.jQuery);
