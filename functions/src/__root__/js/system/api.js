/* global _, $ */
(function (window, site) {
  'use strict';
  site.api = setupApi();

  //TODO make this a site.context option
  var DEFAULT_PAGE_SIZE = 49;

  var currentUrl = window.location.pathname

  // There was a mistyped string that was nearly undetectable.
  // vars for `method` will be more sure.
  var httpMethod = {
    get: 'GET',
    post: 'POST',
    put: 'PUT',
    delete: 'DELETE',
    patch: 'PATCH',
    options: 'OPTIONS'
  };

  function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
          c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
          return c.substring(name.length, c.length);
      }
  }
  return "";
  }

  //create collection/table for this site
  site.api.register('getSetBySlug', getSetBySlug);
  function getSetBySlug(params, success, error, complete) {
    var apiCall = ('getSetBySlug').toString();
    return this.api(httpMethod.get, apiCall, params, success, error, complete);
  }

  //create collection/table for this site
  site.api.register('importCardsFromSet', importCardsFromSet);
  function importCardsFromSet(params, success, error, complete) {
    var apiCall = ('importCardsFromSet').toString();
    return this.api(httpMethod.get, apiCall, params, success, error, complete);
  }

  var apiRoot = 'https://us-central1-mtg-collections.cloudfunctions.net/';
  if(window.location.hostname == 'localhost'){
    apiRoot = 'http://localhost:5001/mtg-collections/us-central1/'
  }

  //create collection/table for this site
  site.api.register('sessionLogin', sessionLogin);
  function sessionLogin(params, success, error, complete) {
    var apiCall = ('sessionLogin').toString();
    return this.api(httpMethod.get, apiCall, params, success, error, complete);
  }


  //create collection/table for this site
  site.api.register('auth:sign-in', signIn);
  function signIn(params, success, error, complete) {
    var apiCall = ('authSignIn').toString();
    return this.api(httpMethod.get, apiCall, params, success, error, complete);
  }

  //site.api.register('auth:sign-in-with-token', signIn);
  function sdignIn(params, success, error, complete) {
    var apiCall = ('authSignInWithToken').toString();
    return this.api(httpMethod.get, apiCall, params, success, error, complete);
  }

  //create collection/table for this site
  site.api.register('create:collection', createColleciton);
  function createColleciton(params, success, error, complete) {
    var apiCall = ('createSiteCollection').toString();
    return this.api(httpMethod.get, apiCall, params, success, error, complete);
  }

  //create a string for all sites
  site.api.register('create:string', createString);
  function createString(params, success, error, complete) {
    var apiCall = ('createString').toString();
    return this.api(httpMethod.get, apiCall, params, success, error, complete);
  }

  function setupApi () {
    var _api = {
      register: registerApiCall
    };
    return _api;
    // helper for creating site.api.* commands
    function registerApiCall (name, method, path) {
      if (arguments.length === 2 && typeof method === 'function') {
        var ctx = {
          api: function (type, url, params, success, error, complete, extend) {
            return $.ajax(ajaxParams(type, url, params, success, error, complete, extend));
          }
        };
        var bound = method.bind(ctx);
        _api[name] = bound;
        site.commands.define('api:' + name, bound);
        return;
      }
      _api[name] = apiCall;
      site.commands.define('api:' + name, apiCall);
      return;
      function ajaxParams (type, url, params, success, error, complete, extend) {
        //var headers = _.extend(site.me.authHeaders(), {
          //'x-appwl': 'localhost'
        //});
        if (!type) type = httpMethod.get;
        var obj = {
          type: type,
          url: apiRoot + url.replace(/^\/+/, ''),
          data: type === httpMethod.get ? $.param(params || {}) : JSON.stringify(params),
          processData: false,
          contentType: 'application/json',
          dataType: 'json',
          // cache: false,
          xhrFields: {
            withCredentials: false
          },
          //headers: headers,
          crossDomain: true,
          success: _makeCallback('response', success),
          error: _makeCallback('error', error),
          complete: _makeCallback('complete', complete)
        };
        if (extend) _.extend(obj, extend);
        return obj;
      }

      function apiCall (params, success, error, complete) {
        var realPath = path.replace(/\/:(\w+)\b/g, function (match, name) {
          if (!(name in params)) throw new Error('api:' + name + ' requires parameter ' + name);
          var val = params[name];
          delete params[name];
          return '/' + val;
        });
        return $.ajax(ajaxParams(method, realPath, params, success, error, complete));
      }
      function _makeCallback (eventType, callback) {
        var fullEvent = 'api:' + eventType + ':' + name;
        return function () {
          var evArgs = [fullEvent].concat([].slice.call(arguments));
          site.events.emit.apply(site.events, evArgs);
          (callback || noop).apply(null, arguments);
        };
      }
    }
  }



  // function extractAuthHeader (acc, item) {
  //   acc[item] = site.storage.get(item);
  //   return acc;
  // }

  // function isAuthHeader (x) {
  //   return x.indexOf('X-Auth-') === 0 && !(/anonymousToken/.test(x)) && site.storage.get(x);
  // }

  function noop () {}
})(window, window.site);
