/* global _ */
(function (window, site) {
  'use strict';

  site.events.onAny(_doDebug('Event'));
  site.commands._emitter.onAny(_doDebug('CommandEvent'));

  function _doDebug (typeLabel) {
    return function () {
      var evt = this.event;
      var args = [].slice.call(arguments, 0);
      var src = site.isIframe ? '[' + ['iframe', (window.frameElement) ? window.frameElement.id : ''].join(':') + ']' : '';
      var who = typeLabel === 'CommandEvent' ? 'CommandRunner' : 'EventBus';
      var didSomething = typeLabel === 'CommandEvent' ? 'called' : 'emitted';
      console.trace(who + src + ': ' + typeLabel + '[' + evt + '] ' + didSomething + ' with args: ', argDesc(args));
    };
  }

  function argDesc (a) {
    var first = a[0];
    if (a.length === 1 && _.isPlainObject(first) && Object.keys(first).length < 6) {
      var out = '';
      for (var x in first) {
        out += x + ':' + JSON.stringify(first[x]) + ' ';
      }
      return out;
    }

    return a;
  }
})(window, window.site);
