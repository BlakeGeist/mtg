/* global _, $, jwt_decode */
(function (window, site) {
  'use strict';

  var tokenTypes = 'admin high low anonymous'.split(' '); // this is also the precedence order for .authLevel()

  function Me () {

    this._user = null;
    this.loggedIn = false;
    this._tokens = initTokens();
    this._initial = true;

    //site.commands.define('me:fetch-details', function () {
      //site.commands.run('api:me:fetch');
    //});

    //site.commands.define('me:logout', _doLogout.bind(this));
    //site.commands.define('me:logout-auto', _doLogoutAuto.bind(this));
    //site.commands.define('me:login', _doLogin.bind(this));
    //site.commands.define('me:drop-high-token', _dropHighToken.bind(this));
    //site.commands.define('me:refresh-tokens', _refreshTokens.bind(this));
    //site.commands.define('me:update', _doMeUpdate.bind(this));
    //site.commands.define('me:break-details-cache', _breakApiCacheForUserDetails);

    //site.events.on('api:complete:auth:global:logout', _refreshTokens.bind(this, { admin: null, low: null, high: null }));
    //site.events.on('api:complete:auth:global:logout-auto', _refreshTokens.bind(this, { admin: null, low: null, high: null, smile: true }));

    // always respond to all api.getMe() calls.
    //site.events.on('api:response:me:fetch', _getMeResponse.bind(this));
    //site.events.on('api:error:me:fetch', _getMeError.bind(this));
    //_readTokens.call(this); // doesn't need to wait until ready
    //site.events.on('global:init', _refreshTokens.bind(this));

    site.events.on('api:complete:auth:sign-in-with-token', function(xhr){
      if(site.helpers.is2XX(xhr)) {
        site.me._user = xhr.responseJSON.user;
        console.log(site.me._user)
      } else {
        console.log('this errored', xhr)
      }
    })
  }

    var _me = Me.prototype;

    _me.getDetails = function () {
      return this._user;
    };

    _me.has = function (level) {
      if (tokenTypes.filter(function (x) { return x === level; }).length === 0) throw new Error('Unknown Authorization Level: ' + level);
      return !!this._tokens[level];
    };

    _me.authLevel = function () {
      for (var i = 0; i < tokenTypes.length; i++) {
        if (this._tokens[tokenTypes[i]]) return tokenTypes[i];
      }
      return 'anonymous';
    };

    _me.grabAndSetUserFromLocalTokens = function () {
      _readTokens.call(this);
      try {
        var cur = this.authLevel();
        var storedUser = site.storage.get(site.keys.userDetailsCache);

        if (cur !== 'anonymous' && storedUser) {
          this._user = storedUser;
        } else {
          var authData = jwt_decode(this._tokens[this.authLevel()]);
          this._user = authData.user;
        }
        this.loggedIn = !!this._user;
        updateHtmlVIPState(this._user);
        updateHtmlLoggedInState(this.loggedIn);
        updateLocaleCookies(this._user);
      } catch (e) {}
    };

    _me.authHeaders = function () {
      var headers = {};
      for (var i = 0; i < tokenTypes.length; i++) {
        if (this._tokens[tokenTypes[i]]) {
          headers.Authorization = 'Bearer ' + this._tokens[tokenTypes[i]];
          return headers;
        }
      }
      return headers;
    };

    function _breakApiCacheForUserDetails () {
      site.storage.set(site.keys.forceUncachedMe, true);
    }

    function _setUser (user) {
      this.loggedIn = !!user;
      this._user = user;
      updateHtmlVIPState(user);
      updateHtmlLoggedInState(this.loggedIn);
      updateLocaleCookies(user);
      site.storage.set(site.keys.userDetailsCache, user);

      if (user) {
        site.storage.set(site.keys.historicToken, _.pick(user, 'id', 'name', 'region', 'language', 'currency', 'whitelabel'));
      }
      try {
        site.events.emit('me:details', this._user);
        if (site.isIframe) {
          site.events.emitRemote('me:details', this._user);
        }
      } catch (e) {}
      return this._user;
    }

    function updateHtmlLoggedInState (loggedIn) {
      if (loggedIn) {
        $('html').addClass('logged-in').removeClass('logged-out');
      } else {
        $('html').addClass('logged-out').removeClass('logged-in');
      }
    }

    function updateHtmlVIPState (user) {
      var hasPlusSixGlobal = (user && user.hasPlusSixGlobal) || false;

      if (hasPlusSixGlobal) {
        $('html').attr('data-hasplussixvip', true);
      } else {
        $('html').attr('data-hasplussixvip', false);
      }
    }

    function updateLocaleCookies (user) {
      if (user) {
        var theFuture = new Date(Date.now() + (1000 * 86400 * 30)).toUTCString();
        var suffix = '; expires=' + theFuture + '; path=/';
        var set = function (k, v) {
          document.cookie = encodeURIComponent(k) + '=' + encodeURIComponent(v) + suffix;
        };

        if (user.language) set('defaultLanguage', user.language);
        if (user.region) set('defaultRegion', user.region);
        if (user.currency) set('defaultCurrency', user.currency);
      }
    }

    function _readTokens () {
      var self = this;
      tokenTypes.forEach(function (t) {
        var value = tokenData(site.storage.get(tokenKey(t)) || null);
        self._tokens[t] = value;
      });
      try {
        self._historicToken = site.storage.get(site.keys.historicToken);
      } catch (e) {
        self._historicToken = null;
      }
      _updateHasTokens.call(this);
    }

    function _storeTokens () {
      var self = this;
      tokenTypes.forEach(function (t) {
        // var value = tokenData(self._tokens[t]);

        site.storage.set(tokenKey(t), self._tokens[t]);
      });
      if (this._historicToken) {
        site.storage.set(site.keys.historicToken, this._historicToken);
      }
      _updateHasTokens.call(this);
    }

    function _updateHasTokens () {
      var cur = this.authLevel();
      var $html = $('html');

      for (var i = 0; i < tokenTypes.length; i++) {
        if (tokenTypes[i] !== 'anonymous') {
          $html[cur === tokenTypes[i] ? 'addClass' : 'removeClass']('token-' + tokenTypes[i]);
        }
      }

      if (this._historicToken) {
        $html[this._historicToken ? 'addClass' : 'removeClass']('token-historic');
      }

      var authState = 'authstate-' + (
        cur === 'high' || cur === 'low' ? cur
        : this._historicToken ? 'historic'
        : 'anonymous'
      );
      $html.attr('class').split(/\s+/).forEach(function (item) {
        if (item.indexOf('authstate-') === 0 && authState !== item) {
          $html.removeClass(item);
        }
      });
    }

    function _refreshTokens (obj) {
      obj = obj || {};
      var self = this;
      var previousUser = this._user;

      console.log(obj);

      tokenTypes.forEach(function (t) {
        // explicitly check against undefined so things can pass 'null' to clear tokens
        self._tokens[t] = tokenData(typeof obj[t] !== 'undefined' ? obj[t] : self._tokens[t]);
        if (self._tokens[t]) site.events.emit('me:has-token:' + t);
      });

      _storeTokens.call(this);

      console.log(this);
      console.log('find me');

      var cur = this.authLevel();
      var shouldGetInfo = false;
      var storedUser = site.storage.get(site.keys.userDetailsCache);

      if (cur !== 'anonymous' && storedUser) {
        _setUser.call(this, storedUser);
        shouldGetInfo = true;
      } else if (self._tokens[cur]) {
        try {
          var authData = jwt_decode(self._tokens[cur]);
          _setUser.call(this, authData.user);
          shouldGetInfo = true;
        } catch (e) {
          _setUser.call(this, null);
        }
      } else {
        _setUser.call(this, null);
      }

      if (self._initial) {
        site.events.emit('global:logged-' + (self._user ? 'in' : 'out'), true, self._user);
      } else {
        if (this._user && !previousUser) {
          site.events.emit('global:logged-in', false, self._user);
        }
        //if the user is auto logged out
        if (obj.smile == true) {
          site.events.emit('global:logged-out-auto', false);
        }
        //if the user manually logs out
        else if (previousUser && !self._user) {
          site.events.emit('global:logged-out', false);
        }
      }

      self._initial = false;
      if (shouldGetInfo) site.commands.run('me:fetch-details');
    }

    function _dropHighToken () {
      _refreshTokens.call(this, { admin: null, high: null });
    }

    function _doLogout () {
      site.storage.remove(site.keys.userDetailsCache);
      site.commands.run('api:auth:global:logout');
    }

    function _doLogoutAuto () {
      site.storage.remove(site.keys.userDetailsCache);
      site.commands.run('api:auth:global:logout-auto');
    }

    function _doLogin (o_tokens) {
      if (!o_tokens) throw new Error('login call requires tokens to be sent!');
      _refreshTokens.call(this, o_tokens);
    }

    function _doMeUpdate (o_updates) {
      var self = this;
      var user = _.extend({}, this._user, o_updates);
      site.commands.run('api:me:update', o_updates, function success () {
        _setUser.call(self, user);
      });
    }

    function _getMeResponse (data) {
      if (data && data.users && data.users.length) {
        var user = data.users[0];
        _setUser.call(this, user);
      } else {
        _doLogout.call(this);
      }
    }

    function _getMeError (xhr, errType, errMsg) {
      if (xhr.status === 401) _doLogout.call(this);
    }

    function tokenKey (t) {
      return 'X-Auth-' + t + 'Token';
    }

    function initTokens () {
      return tokenTypes.reduce(function (m, x) { m[x] = null; return m; }, {});
    }

    function tokenData (token) {
      if (!token) return null;

      var value = token;
      var decodedValue;
      try {
        decodedValue = jwt_decode(value);
        if (decodedValue.exp * 1000 < Date.now()) {
          value = null;
        }
      } catch (e) {
        value = null;
      }
      return value;
    }

    site.me = new Me();
})(window, window.site);
