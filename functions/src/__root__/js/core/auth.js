/* global _, $, site */
(function (window, document, site) {
  'use strict';
  var _storage = site.storage;
  var _keys = site.keys;

  var POST_AUTH_REDIRECT = _keys.postAuthRedirect;
  var POST_AUTH_OVERRIDE = _keys.postAuthOverride;

  var C = site.commands;
  var E = site.events;
  var H = site.helpers;

  var CONTEXT = site.context;
  var SETTINGS = CONTEXT.settings;
  var LANGUAGE = SETTINGS.language;
  var REGION = SETTINGS.region;


  preDomReady();

  function preDomReady () {
    initializeFunctions();
    initializeEvents();
    initializeCommands();
  }

  function initializeFunctions () {
    site.auth = {};
    site.auth.authSuccess = authSuccess;
    site.autostAuthRedirect = postAuthRedirect;
  }

  function initializeCommands () {
    C.define('auth:logout', function () {
      firebase.auth().signOut()
        .then(function() {
          site.storage.remove('__session=uid');
          setCookie('__session=uid', '', -1)

          console.log('Signed Out');
          C.run('navigate:home');
        }, function(error) {
          console.error('Sign Out Error', error);
        });
    });
    C.define('auth:show:signup', function () {
      C.run('modal:open', 'auth-create-free-account');
    });
    C.define('auth:show:account', function () {
      toggleMenu('account');
    });
    C.define('auth:show:forgot-password', function () {
      toggleMenu('login');
      showForm('emailForgot');
    });
  }

  function initializeEvents() {
    E.on('global:ready', initAuthForms);
    E.on('global:ready', initAuthButtonCommands);
    E.on('api:complete:auth:sign-in', handlePostEmailLogin);
  }

  function handlePostEmailLogin(xhr){
    if(H.is2XX(xhr)) {
      var user = xhr.responseJSON.user;
      C.run('me:login', user);
    } else {
      console.log('failed to log user in');
    }
  }


  function initAuthButtonCommands(){
    $(document).on('click', '[data-auth="sign-out"]', function(event){
      H.stopEvents(event);
      setCookie('__session=uid', '', -1)

      C.run('auth:logout');
    });
  }

  function initAuthForms(){
    $(document).on('submit', '[data-auth-form="sign-up"]', function(event){
      H.stopEvents(event);
      var formData = H.getFormData(this);
      firebase.auth().createUserWithEmailAndPassword(formData.email, formData.password)
        .then(function(res){
          var user = res.user;
          setCookie('__session=uid', user.uid, 7)
          C.run('navigate:home');
        })
        .catch(function(error) {
          // Handle Errors here.
          var errorCode = error.code;
          var errorMessage = error.message;
          // [START_EXCLUDE]
          if (errorCode == 'auth/weak-password') {
            alert('The password is too weak.');
          } else {
            alert(errorMessage);
          }
          console.log(error);
          // [END_EXCLUDE]
        });
    });

    $(document).on('submit', '[data-auth-form="sign-in"]', function(event){
      H.stopEvents(event);
      var formData = H.getFormData(this);
      //C.run('api:auth:sign-in', formData);
      //return;
      firebase.auth().signInWithEmailAndPassword(formData.email, formData.password).then(function(user) {
        // Get the user's ID token as it is needed to exchange for a session cookie.

      }).then(function() {
        // A page redirect would suffice as the persistence is set to NONE.
        return firebase.auth().signOut();
      }).then(function() {
      });

      firebase.auth().onAuthStateChanged(function(user) {
        if(user){
          setCookie('__session=uid', user.uid, 7)
          C.run('navigate:home');
        }
      })

    });
  }

  function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
  }

  function handlePostPasswordReset (xhr) {
    var email = $('[data-target="email"]').val();
    C.run('modal:close');
    C.run('modal:open', 'auth-forgot-password-email-sent', {
      email: email
    });
  }

  function handlePostThirdParty (type) {
    var payload = {};
    var network;
    if (type !== 'login') {
      var referral = _storage.get('referral');
      if (referral) _.extend(payload, {referral: referral});
    }
    var verificationKey = H.param('key');
    C.run('api:auth:status', type, verificationKey, payload, function success (data, status, xhr) {
      // this is hacky, but the /link/verify endpoint doesn't set us new headers, which would cause
      // headers to get cleared out. therefore we pass a flag for "skipTokens"
      if (type === 'link') return authSuccess(xhr, {tokens:false});

      if(type=='signup'){
        return authSuccess(xhr,null,true);
      }
      authSuccess(xhr);
    }, function authError (xhr, status) {
      console.error("Unimplemented: third party auth errors");
    });
  }

  var authSuccessDefaults = {
    tokens: true,
    redir: true,
    breakCache: true
  };

  function authSuccess (xhr, options, signup) {
    options = _.defaults({}, options, authSuccessDefaults);
    if (xhr.status >= 200 && xhr.status < 300) { // 200 for login, 201 for reg, 202 for activate
      if (options.breakCache) {
        C.run('me:break-details-cache');
      }
      if (options.tokens) {
        var tokens = {
          low: xhr.getResponseHeader('X-Auth-lowToken'),
          high: xhr.getResponseHeader('X-Auth-highToken'),
          admin: xhr.getResponseHeader('X-Auth-adminToken')
        };

        C.run('me:login', tokens);
        var regionflag = xhr.responseJSON.users[0].regionChanged;

        var url = window.location.pathname;

        if(!regionflag){
          var user=xhr.responseJSON.users[0];
          var url = window.location.pathname;
          //'/us/en/u/finalize/';
          var path = url.split( '/' );
          if(user.region){
            path[1]=user.region;
          }
          if(user.language){
            path[2]=user.language;
          }
          var stripped = "";
          for (var i = 0; i < 3; i++ ) {
            if(i>0) stripped += "/";
            stripped += path[i];
          }
          if (url.indexOf('/p/lp/') > -1) {
            return C.runRemote('navigate:url',stripped+ "/p/lp/thank-you/");
          }

          var iccBankName = H.determineIccBank();
          if (iccBankName) {
            // DOHA BANK ICC Integration requirements
            return;
          }

          return C.runRemote('navigate:url', stripped+"/me/settings");
        }
      }

      if(signup) {
        //if there is no POST_AUTH_OVERRIDE set the homepahe as the target
        if (!_storage.get(POST_AUTH_OVERRIDE)) {
          _storage.set(POST_AUTH_OVERRIDE, window.location.href);
          _storage.set(POST_AUTH_REDIRECT, window.location.href);
        }
      /*  _storage.remove('camp_attr');
        _storage.remove('date_camp_cookie');*/
        var user=xhr.responseJSON.users[0];
        var url = window.location.pathname;
        //'/us/en/u/finalize/';
        var path = url.split( '/' );
        if(user.region){
          path[1]=user.region;
        }
        if(user.language){
          path[2]=user.language;
        }
        var stripped = "";
        for (var i = 0; i < 3; i++ ) {
          if(i>0) stripped += "/";
          stripped += path[i];
        }
        //is is sign in
      } else {
        //get the home url as a var
        var home = H.returnHomeURL();
        //get the query strings as a var
        var urlParams = H.params();
        //if there is an adwordsAction cookie on sign in
        if (urlParams.adwordsAction || urlParams.adwordsaction) {
          //then we dont want this user to funnle into the sign up flow, therefore send them home
          _storage.set(POST_AUTH_OVERRIDE, home);
          _storage.set(POST_AUTH_REDIRECT, home);
          //is if ther eis not already a POST_AUTH_OVERRIDE send them to the current pages' url
        } else if (!_storage.get(POST_AUTH_OVERRIDE)) {
          _storage.set(POST_AUTH_OVERRIDE, window.location.href);
          _storage.set(POST_AUTH_REDIRECT, window.location.href);
        }
      }

      if (options.redir) {
        var userlang=xhr.responseJSON.users[0].language;
        var userregion=xhr.responseJSON.users[0].region;

        if ($('html').hasClass('is-at-full-page-auth')) {
          return;
        }
        //var url = window.location.pathname;
        ////'/us/en/u/finalize/';
        //var path = url.split( '/' );
        //var stripped = "";
        //for (var i = 0; i < 2; i++ ) {
        //  if(i>0) stripped += "/";
        //  stripped += path[i];
        //}

        // this was moved to the end of postAuthRedirect() as I needed the postAuthRedirect() to fire off and I did not see a way around this
        // C.runRemote('navigate:url',"/"+userregion+"/"+userlang);
        return postAuthRedirect(userlang, userregion);
      }
    }
  }

  function currentRootURL() {
    var url = window.location.pathname;
    //'/us/en/u/finalize/';
    var path = url.split( '/' );
    var stripped = "";
    for (var i = 0; i < 3; i++ ) {
      if(i>0) stripped += "/";
      stripped += path[i];
    }
    return stripped;
  }

  function postAuthRedirect (userlang, userregion) {
    var locOverride = _storage.get(POST_AUTH_OVERRIDE);
    var loc = _storage.get(POST_AUTH_REDIRECT);

    _storage.remove(POST_AUTH_REDIRECT);
    _storage.remove(POST_AUTH_OVERRIDE);

    ///set the adwords cookie to null
    setAdwordsUserFlowCookie(ADWORDS_USER_FLOW, '');

    var currentUrl = window.location.pathname;

    if (currentUrl.indexOf("p/lp/join") >= 0) {
      var $user = site.me.getDetails();
      if($user.hasPlusSixGlobal === true) {
        return C.runRemote('navigate:home');
      }
      C.runRemote('navigate:url', locOverride);
      return;
    }

    //handle luxury page sign in
    if (locOverride && locOverride.indexOf("/luxury/") >= 0) {
      var path = locOverride.split( '/' );
      if(userregion){
        path[3]=userregion;
      }
      if(userlang){
        path[4]=userlang;
      }
      path=path.join('/');
      C.runRemote('navigate:url', path);
      return;
    }

    // This needs to be there to redirect the user to the current page after logging in
    if (locOverride) {
      if (locOverride == 'false') {
        return;
      }
      var path = locOverride.split( '/' );
      if(userregion){
        path[3]=userregion;
      }
      if(userlang){
        path[4]=userlang;
      }
      path=path.join('/');
      C.runRemote('navigate:url', path);
      return;
    }


    // if the user came from the thank you page keep em there
    if((window.location.pathname.indexOf("p/lp/thank-you/") > -1) && (window.location.search.indexOf("email") > -1) && (window.location.search.indexOf("id") > -1)) {
     C.runRemote('navigate:url',"/"+userregion+ "/" + userlang + '/p/lp/thank-you/')
    }
  }

})(window, document, site);
