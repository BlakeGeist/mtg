/* global _, $, site */
(function (window, document, site, handlebars) {
  'use strict';

  var _storage = site.storage;
  var _keys = site.keys;
  var POST_AUTH_REDIRECT = _keys.postAuthRedirect;
  var POST_AUTH_OVERRIDE = _keys.postAuthOverride;
  var H = site.helpers;
  var C = site.commands;
  var E = site.events;
  var USER;
  var paginationTarget =

  preDomReady();

  function preDomReady () {
    initUI();
    initCommands();
    initEvents();
  }

  function initUI () {
    if (site.isIframe) {
      //initIframe();
    } else {
      //initMain();
    }
  }

  function initCommands() {
  }

  function initEvents() {
    E.on('global:ready', ready);
    E.on('api:complete:paginateCards', handleCardPaginatedCardsResponse);
    E.on('api:complete:updateSet', handleSetUpdateResponse);
  }

  function ready() {

    $(document).on('click', '[data-edit-set]', function(e){
      H.stopEvents(e);
      var slug = $(this).data('edit-set');
      var set = site.context.sets[slug];
      C.run('modal:open', 'edit-set', {
        set: set
      })
    });

    $(document).on('click', '[data-init-cards-pagination]', function(e){
      H.stopEvents(e)
      var target = $('[data-init-cards-pagination]').data('init-cards-pagination');
      var payload = {
        startAfter: target
      }
      C.run('api:paginateCards', payload);
    });

    $(document).on('change', '[data-target="sets-select"]', function(e){
      var targetSet = $(this).find(":selected").val();
      C.run('navigate:page', 'set/' + targetSet);
    })

    $(document).on('change', '[data-select-target="language"]', function(event){
      var targetLanguage = $(this).find(":selected").val();
      C.run('navigate:language', targetLanguage);
    });

    $(document).on('click', '[data-collection-delete-taraget]', function(event){
      H.stopEvents(event);
      var targetItem = $(this).data('collection-delete-taraget');
      C.run('data:delete:collection-item', targetItem);
    });

    $(document).on('submit', '[data-product="import-from-csv"]', function(event){
      H.stopEvents(event);
      var formData = H.getFormData(this);
      console.log(formData.file)
    });

    $('html').on('keyup', function (event) {
      if (event.keyCode === 27) {
        var alreadyOpenModal = $('.modal.active').html();
        if (alreadyOpenModal) {
          C.run('modal:close');
        }
        // if escape is pressed remove all is-active css tags
        $('.is-active').removeClass('is-active');
      }
    });

    $('#modalBackdrop').on('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      C.run('modal:close');
    });

    $(document).on('submit', '[data-form-update="set"]', function(e){
      H.stopEvents(e)
      var formData = H.getFormData(this);
      C.run('api:updateSet', formData);
    });
  }

  $(document).on('click', '[data-toggle-expander]', function(e){
    H.stopEvents(e);
    $('.is-open').removeClass('is-open');
    $(this).parent().addClass('is-open');
  })

  $(document).on('click', 'html', function(e){
    $('.is-open').removeClass('is-open');
  })

  $(document).on('click', '.is-open', function(e){
    e.stopPropagation();
  });

  function initUIForUser(user) {
  }


  function handleCardPaginatedCardsResponse(xhr) {
    var cards = xhr.responseJSON;
    var cardsContainer = $('.cards');
    $('.cards-button').remove();
    var template = H.renderPartial('cards', {
      cards: cards
    });
    cardsContainer.append(template)
  }

  function handleSetUpdateResponse(xhr){
    location.reload();
  }

})(window, document, site, window.Handlebars);
