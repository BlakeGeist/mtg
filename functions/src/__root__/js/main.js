/* global _, $, moment, Basil, EventEmitter2, Swag */
(function (window, document, site) {
  'use strict';

  var _initCalled = false;
  var _doReadyOnInit = false;

  return main();

  function main () {
    var url = window.location.pathname;
    var path = url.split( '/' );
    var stripped = "";
    for (var i = 3; i < path.length; i++ ) {
      if (i>0) stripped += "/";
      stripped += path[i];
    }

    var language = path[2];


    site.isReady = false;
    site.isIframe = (window !== window.parent) || window.location.hash === '#i=1';
    site.isVisible = !document.hidden;
    site.visibility = document.visibilityState || 'visible';

    setupEvents(site);
    setupStorage(site);
    defineKeys(site);

    // site.init() is called only once, at the very end of body. it happens
    // pre-domready (and is when the initial logged-in/logged-out event fires)
    // although since it happens immediately before the closing body tag the dom
    // is totally complete and ready when this runs.
    site.init = function () {
      if (_initCalled) return; // only let this be called once
      _initCalled = true;
      site.events.emit('global:init');
      if (_doReadyOnInit) setTimeout(domReady, 0);
    };

    $(document).ready(domReady);
    $(document).on('visibilitychange', visibilityHandler);
  }

  // have a single domReady handler. everything else should register site.events.on('global:ready');
  function domReady () {
    if (!_initCalled) {
      _doReadyOnInit = true;
      return;
    }
    site.isReady = true;

    // do this first, just in case.
    configureVendorLibs();

    // call all other domready site.events
    site.events.emit('global:ready');
    site.events.domReadyDone = true;
  }

  function visibilityHandler () {
    var v = site.isVisible = !document.hidden;
    site.visibility = document.visibilityState;
    var genericEvent = 'global:visibility:changed';
    var specificEvent = 'global:visibility:set-' + (v ? 'visible' : 'hidden');
    [genericEvent, specificEvent].forEach(function (event) {
      site.events.emit(event, _.pick(site, 'isVisible', 'visibility'));
    });
  }

  function configureVendorLibs () {
    var lang = _.get(site, 'context.settings.language');
    if (lang) moment.locale(lang);
    Swag.registerHelpers(window.Handlebars);
  }

  function setupStorage (obj) {
    var _storage = new Basil({ storages: ['local', 'cookie'], namespace: 'Site' });
    _storage.session = new Basil({storages: ['session'], namespace: 'Site-Session'});
    _storage.memory = new Basil({storages: ['memory'], namespace: 'Site'});

    // normally you won't ever access this directly. use site.uiPreferences instead.
    _storage._uiPrefs = new Basil({storages: ['session'], namespace: 'Site-UI-Preferences'});
    obj.storage = _storage;
  }

  function setupEvents (obj) {
    var _events = new EventEmitter2({
      wildcard: true,
      delimiter: ':',
      maxListeners: 50 // probably enough
    });

    var _commands = {
      _emitter: new EventEmitter2({
        wildcard: true,
        delimiter: ':',
        maxListeners: 1 // this only sets a warning, the two calls below manage this better
      })
    };

    var originalOn = _events.on;
    _events.on = function (eventName, fn) {
      if (eventName === 'global:ready' && _events.domReadyDone) {
        return setTimeout(fn, 0); // run this ready event as soon as the event loop is clear again
      }
      return originalOn.apply(this, arguments);
    };

    _commands.define = function (eventName) {
      if (_commands._emitter.listeners(eventName).length) {
        throw new Error('Multiple Definitions of command not allowed: ' + eventName);
      }
      return _commands._emitter.on.apply(_commands._emitter, arguments);
    };

    _commands.run = function (eventName) {
      if (!_commands._emitter.listeners(eventName).length) {
        throw new Error("Attempt to .run() a command that doesn't exist: " + eventName);
      }
      return _commands._emitter.emit.apply(_commands._emitter, arguments);
    };


    //TODO
    //the function below was commented out by Blake on 2019/01/22 I did this because
    //we are trying to get events to fire within an iframe for a marketing campagin.
    //The main issue was / is oauth, the redirect wasnt working when the below was active
    //if this gets addressed also look at the hunk below, as its whats placed this commented out section

    //if (obj.isIframe) {
      //_events.emitRemote = _sendEvent('remote-event', window.parent);
      //_commands.runRemote = _sendEvent('remote-command', window.parent);
    //} else {
      //_events.emitRemote = _events.emit;
      //_commands.runRemote = _commands.run;
      //_events.emitIframe = function (child) {
        //var win = child.get(0).contentWindow;
        //var args = [].slice.call(arguments, 1);
        //_sendEvent('remote-event', win).apply(null, args);
      //};
      //_commands.runIframe = function (child) {
        //var win = child.get(0).contentWindow;
        //var args = [].slice.call(arguments, 1);
        //_sendEvent('remote-command', win).apply(null, args);
      //};
    //}

    _events.emitRemote = _events.emit;
    _commands.runRemote = _commands.run;
    _events.emitIframe = function (child) {
      var win = child.get(0).contentWindow;
      var args = [].slice.call(arguments, 1);
      _sendEvent('remote-event', win).apply(null, args);
    };
    _commands.runIframe = function (child) {
      var win = child.get(0).contentWindow;
      var args = [].slice.call(arguments, 1);
      _sendEvent('remote-command', win).apply(null, args);
    };


    $(window).on('message', _acceptRemoteEvent.bind(null, _events, _commands));

    obj.events = _events;
    obj.commands = _commands;

    return _events;
  }

  function defineKeys (obj) {
    var keys = {};
    keys.postAuthRedirect = 'post-auth-redirect-location';
    keys.postAuthOverride = 'post-auth-redirect-override';
    keys.userDetailsCache = 'cached-user-details-object';
    keys.coinbaseAccessToken = 'cached-coinbase-access-token';
    keys.historicToken = 'historic-user';
    keys.lastOAuthType = 'last-oauth-type';
    keys.forceUncachedMe = 'needs-fresh-self-data';
    obj.keys = keys;
  }

  function _acceptRemoteEvent (eventBus, commandBus, event) {
    if (event.originalEvent) event = event.originalEvent;
    var message = event.data.messageData;
    var eventType = event.data.messageType;

    if (event.origin !== window.location.origin) return;
    if (eventType !== 'remote-event' && eventType !== 'remote-command') return;

  }

  function _sendEvent (messageType, target) {
    return function event$handler$$ (eventName) {
      var args = [].slice.call(arguments, 1);
      target.postMessage({
        messageType: messageType,
        messageData: {
          eventName: eventName,
          arguments: args
        }
      }, window.location.origin);
    };
  }
})(window, document, window.site);
