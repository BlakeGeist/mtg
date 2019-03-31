/* global _, $ */
(function (window, site, handlebars) {
  'use strict';

  // var $body = $(document.body);
  var $html = $(document.documentElement);

  // this intentionally isn't stored on the site object
  var state = {
    activeModal: null
  };

  var C = site.commands;
  var E = site.events;
  var H = site.helpers;
  var db = firebase.firestore();

  preDomReady();

  function preDomReady() {
    initializeCommands();
    initializeEvents();
  }

  function initializeCommands(){
    C.define('data:delete:collection-item', deletePropsal);
    C.define('data:push:collection-item', pushCollectionItem);
    C.define('user:push:userAttrs', pushUserAttrs);
    C.define('user:push:string', pushString);
  }

  function initializeEvents () {
    E.on('global:ready', ready);
  }

  function ready() {
    $(document).on('submit', '[data-collection-form]', function(event){
      H.stopEvents(event);
      var collectionTarget = $(this).data('collection-form') + "s";
      var formData = H.getFormData(this);
      var payload = {
        collection: collectionTarget,
        doc: formData
      }
      payload.doc.slug = H.slugify(formData.name);
      console.log(payload)
      C.run('data:push:collection-item', payload);
    });
  }

  function pushUserAttrs(data){
    var data = {}
    var db = firebase.firestore();
    data.collection = "userAttrs"
    var collection = data.collection;
    data.doc = {
      name: "Blake2",
      state: "CA",
      slug:  "blake-2"
    }
    var slug = site.context.userData2.uid;
    db.collection(collection).doc(slug).set(data.doc)
    .then(function() {
      E.emit('response:data:push:collection-item', "added " + slug + " to " + collection);
    })
    .catch(function(error) {
      E.emit('response:data:push:collection-item', "error failed to add " + slug + " to " + collection);
    });
  }

  function pushCollectionItem(data){
    var collection = data.collection;
    var slug = data.doc.slug;
    db.collection(collection).doc(slug).set(data.doc)
    .then(function() {
      E.emit('response:data:push:collection-item', "added " + slug + " to " + collection);
      C.run('navigate:page', '/' + collection.slice(0, -1) + '/' + slug);
    })
    .catch(function(error) {
      E.emit('response:data:push:collection-item', "error failed to add " + slug + " to " + collection);
    });
  }

  function pushString(string){
    string = {
      name: testString,
      value: "this is my test string",
      targetLang: 'en'
    }
    var payload = {}
    payload[string.targetLang] = string.value;

    var db = firebase.firestore();
    var name = string.name;
    db.collection('strings').doc(name).set(payload)
    .then(function() {
      E.emit('response:data:push:string', "added " + name + " to strings" );
    })
    .catch(function(error) {
      E.emit('response:data:push:collection-item', "error failed to add " + name + " to strings");
    });
  }

  function deletePropsal(slug){
    db.collection("proposals").doc(slug).delete().then(function() {
      location.reload();
      console.log("Document successfully deleted!");
    }).catch(function(error) {
      console.error("Error removing document: ", error);
    });
  }

})(window, window.site, window.Handlebars);
