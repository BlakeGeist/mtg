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

  preDomReady();

  function preDomReady() {
    initializeCommands();
    initializeEvents();
  }

  function initializeCommands(){
    C.define('modal:open:element', openModalElement);
    C.define('modal:open', openModalTemplate);
    C.define('modal:close', closeModal);
  }

  function initializeEvents () {
    E.on('global:ready', ready);
  }

  function ready() {
    $(document).on('click', '[data-open-modal]', function(event) {
      H.stopEvents(event)
      var target = $(this).data('open-modal');
      C.run('modal:open', target);
    });
  }


  function openModalTemplate (tplName, data, ready) {
    var html = $('html');
    if(html.hasClass('is-at-full-page-auth')){
      C.run('auth:full-page:close');
    }
    var tpl = site.partials['templates/modals/' + tplName];
    if (!tpl) return;
    var tplArgs = _.extend(_.omit(site.context, 'data'), {
      data: data
      //currentUser: site.me.getDetails()
    });

    var compiled = "<div class='modal' id='modal-" + tplName + "'>" + tpl(tplArgs) + '</div>';
    var $modal = $(compiled);
    console.log($modal)
    $modal.appendTo('#modalBackdrop');
    $('#modalBackdrop').addClass(tplName + '-modal');

    if (typeof ready === 'function') ready($modal);
    C.run('modal:open:element', $modal, tplArgs);

    E.once('modal:did-close:' + tplName, function oneTimeRemover () {
      $modal.remove();
    });
  }

  function closeModal () {
    $html.removeClass('has-modal');
    var modal, id;
    if (state.activeModal) {
      id = state.activeModal.attr('id').replace(/^modal-/, '');
      modal = state.activeModal;
      modal.removeClass('active');
      if (modal.is('iframe')) {
        if (!modal.is('.persistent')) {
          modal.attr('src', '');
        }
      }
      state.activeModal = null;
    }
    //on close set the @modalBackdrop classes to 'modal-backdrop'
    //this was added because the modals were keeping the previously opened modal's class name
    $('#modalBackdrop').removeClass().addClass('modal-backdrop');
    E.emit('modal:did-close', modal);
    if (id) E.emit('modal:did-close:' + id, modal);
  }

  function openModalElement (selector, params) {
    var $elem = $(selector);
    openModal($elem, params);
  }

  function openModal (modal, params) {
    var id = modal.attr('id').replace(/^modal-/, '');
    state.activeModal = modal;
    modal.on('click', function (e) {
      // prevent clicks on the modal from propagating up to the modal backdrop.
      // we do this because the modal backdrop serves to both perform as a modal
      // backdrop and also do a bunch of flexbox voodoo for positioning the modal.
      e.stopPropagation();
    });

    modal.find('[data-role=modal-close]').off('click').on('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      C.run('modal:close');
    });

    $html.addClass('has-modal');

    setTimeout(function () {
      if (modal.is('iframe')) E.emitIframe(modal, 'modal:did-open:self', id, params);
      E.emit('modal:did-open', modal, params);
      E.emit('modal:did-open:' + id, modal, params);
      $html.addClass('modal-ready');
      modal.addClass('active');
    }, 0);

  }

})(window, window.site, window.Handlebars);
