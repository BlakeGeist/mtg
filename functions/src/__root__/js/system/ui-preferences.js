/* global _ */
(function (window, site) {
  'use strict';

  // fake these two for now:

  var uiPrefs = site.uiPreferences = setupPreferences();

  uiPrefs.define('dashboard:show-cheat-sheet', true);
  uiPrefs.define('referrals:show-what-is-this', true);
  uiPrefs.define('marketing:accepts', true);

  site.events.on('me:details', uiPrefs.init);
  site.events.on('global:logged-out', uiPrefs.clean);

  function setupPreferences () {
    var uiPrefsHandler = {
      _defaultValues: {},

      set: function (k, v, nosync) {
        if (!(k in this._defaultValues)) throw new Error('Unknown UI Preference ' + k + '. UI Preferences must be pre-defined in system/ui-preferences');

        var user = site.me.getDetails();
        if (user && user.prefs) {
          user.prefs[k] = v;
        }

        if (!nosync) {
          this.sync([k]);
          site.events.emit('ui-preferences:updated', this.all());
        }
      },

      get: function (k) {
        if (!(k in this._defaultValues)) throw new Error('Unknown UI Preference ' + k + '. UI Preferences must be pre-defined in system/ui-preferences');

        var user = site.me.getDetails();
        var val;
        if (user && user.prefs) {
          val = user.prefs[k];
        }

        if (_.isNull(val)) {
          this.set(k, this._defaultValues[k]);
          return this._defaultValues[k];
        }

        return val;
      },

      all: function () {
        var user = site.me.getDetails();
        var current = {};

        if (user && user.prefs) {
          current = user.prefs;
        }
        return _.defaults({}, current, this._defaultValues);
      },

      init: function () {
        var self = this;
        var user = site.me.getDetails();
        if (user && user.prefs) {
          for (var key in user.prefs) {
            var val = user.prefs[key];
            self.set(key, val, true);
          }
          site.events.emit('ui-preferences:updated', self.all());
        }
      },

      clean: function () {
        // noop
      },

      sync: function (which) {
        var all = this.all();
        site.commands.run('api:me:preferences:update', which ? _.pick(all, which) : all);
      },

      define: function (name, defaultValue) {
        this._defaultValues[name] = defaultValue;
      }
    };

    for (var k in uiPrefsHandler) {
      if (typeof uiPrefsHandler[k] === 'function') {
        uiPrefsHandler[k] = uiPrefsHandler[k].bind(uiPrefsHandler);
      }
    }

    return uiPrefsHandler;
  }
})(window, window.site);
