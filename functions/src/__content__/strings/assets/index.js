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
    $(document).on('submit', '[data-form="strings"]', function(event){
      H.stopEvents(event);
      var formData = H.getFormData(this);

      var translateString = firebase.functions().httpsCallable('translateString');
      translateString({text: messageText}).then(function(result) {
        // Read result of the Cloud Function.
        var sanitizedMessage = result.data.text;
        console.log(sanitizedMessage)
        // ...
      });

    })
  }

})(window, window.site, window.jQuery);
