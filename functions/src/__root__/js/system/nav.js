 (function (window, site) {
  'use strict';
  // regex helpers
  var initialSlash = /^\//;
  var finalSlash = /\/$/;
  var  _storage = site.storage;

  site.commands.define('navigate:api', navigateToApi);
  site.commands.define('navigate:back', navigateBack);
  site.commands.define('navigate:home', navigateToHome);
  site.commands.define('navigate:language', navigateToLanguage);
  site.commands.define('navigate:oauth', navigateToOAuth);
  site.commands.define('navigate:page', navigateToPage);
  site.commands.define('navigate:region', navigateToRegion);
  site.commands.define('navigate:remote', navigateToRemoteUrl);
  site.commands.define('navigate:url', navigateToUrl);
  site.commands.define('navigate:tab', navigateToTab);
  site.commands.define('navigate:search', navToSearchPage);

  return;

  function navToSearchPage(target){
    var path = "search/?q=" + target.toLowerCase();

    site.commands.run('navigate:page', path);
  }

  function navigateToTab (path, tab) {
  	// is path of our location url?
  	// if yes we do not need to reload
  	if (window.location.pathname.indexOf(path) > -1) {
  		window.location.hash = '#' + tab;
  	} else {
	  	var url = [window.location.origin + window.location.pathname.replace(/\/$/, '')];
	  	if (path) {
	  		url.push(path);
	  	}
	  	url.push('#' + tab);
	  	site.commands.run('navigate:url',  url.join('/'));
  	}
  }

  function navigateToUrl (s_url) {
    var url = /^https?:/.test(s_url) ? s_url : window.location.origin + '/' + s_url.replace(initialSlash, '');
    if (url.replace(/#.*/, '') === window.location.toString().replace(/#.*/, '')) {
      window.location.replace(url);
      window.location.reload(); // have to reload manually in this case.
    } else {
      window.location = url;
    }
  }

  function navigateBack () {
    try { window.history.back(); } catch (e) {
      site.commands.run('navigate:home');
    }
  }

  function navigateToRemoteUrl (s_url) {
    window.location = s_url;
  }

  function navigateToApi (s_url) {
    var base = site.context.settings.api;
    var url = base.replace(finalSlash, '') + '/' + s_url.replace(initialSlash, '');
    // console.log('SENDING TO', url);
    window.top.location = url;
  }

  function navigateToPage (s_page) {
    // var origin = window.location.origin;
    var path = window.location.pathname.split('/');
    var url = [path[1], path[2], s_page.replace(initialSlash, '')].join('/');
    site.commands.run('navigate:url', url);
  }

  function navigateToHome () {
    var path = '/';
    site.commands.run('navigate:page', path);
  }

  function navigateToRegion (s_region, lang) {
    var path = window.location.pathname.split('/');
    path[1] = s_region;
    if (lang) {
      path = _changeLanguagePath(lang, path);
    }
    var search = window.location.search || "";
    site.commands.run('navigate:url', path.join('/') + search);
  }

  function _findBestPeer (currentSlug, peers, region, language, state) {
    var slug = null;
    var match = null;
    peers.forEach(function (peer) {
      if (peer.lang === language) {
        if (!state || (state && peer.state === state)) {
          if (peer.region === region) {
            match = peer;
            slug = peer.slug;
          } else if (peer.region === 'global' && !match) {
            match = peer;
            slug = peer.slug;
          }
        }
      }
    });
    return slug || currentSlug;
  }

  function navigateToLanguage (s_lang) {
    var path = window.location.pathname.split('/');
    path = _changeLanguagePath(s_lang, path);
    var search = window.location.search || "";
    site.commands.run('navigate:url', path.join('/') + search);
  }

  function _changeLanguagePath(s_lang, path) {
    var lookup = path[4];
    var slug;
    path[2] = s_lang;
    if (path[3] === 'c') {
      try {
        path[4] = _findBestPeer(path[4], site.context.data.category.peers || [], path[1], s_lang);
      } catch (e) {
        path.splice(4, 1);
        path[3] = 'categories';
      }
    } else if (path[3] === 'e') {
      try {
        path[4] = _findBestPeer(path[4], site.context.data.event.peers || [], path[1], s_lang, site.context.data.event.state);
      } catch (e) {
        path.splice(4, 1);
        path[3] = 'events';
      }
    }
    return path;
  }

  function navigateToOAuth (type, network, returnUrl) {
    if (!/^(login|signup|link)$/.test(type)) throw new Error('invalid auth type: ' + type + ' / ' + network);
    if (!/^(twitter|google|facebook)$/.test(network)) throw new Error('invalid auth type: ' + type + ' / ' + network);

    if (returnUrl) {
      if (returnUrl.indexOf('/u/') > -1) returnUrl = site.helpers.url('/');
      site.storage.set(site.keys.postAuthRedirect, returnUrl);
    }

    //get selected country from join modal
    var selectedCountry  = $('#country').val();
    var urlEnd = site.helpers.url('/u/finalize/', {type: type});
    if(urlEnd.indexOf('signup') > 1){
      var res = urlEnd.split("/");
      res[1]=selectedCountry;
      urlEnd=res.join('/');
    }

    var redirectUri = window.location.origin + urlEnd;

    var hasReferralInput = $('[data-target="referral-input"]').length >= 1;
    if(hasReferralInput){
      redirectUri = site.context.settings.wlUrl + urlEnd;
    }


    site.storage.set(site.keys.lastOAuthType, network);

    if (type === 'link') {
      site.commands.run('api:auth:' + network + ':link', {redirect_uri: redirectUri}, function (data) {
        site.commands.runRemote('navigate:api', data.target);
      });
      return;
    }

    if(_storage.get('referral')){
      var referral= $.param(_storage.get('referral'));
    }

    if((window.location.search).substr(1)){
       referral =(window.location.search).substr(1);
    }
    console.log("result",referral);

    var path = ['', type, network].join('/') + '?redirect_uri=' + encodeURIComponent(redirectUri + '&' + referral) + '&whitelabel=' + site.context.settings.wl;
    site.commands.runRemote('navigate:api', path);
    console.log('window to find baid url values :', window.location);
  }
})(window, window.site);
