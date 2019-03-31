/* global _, $, Handlebars, Swag */
/*
 * For super simple helper functions that don't need/deserve a whole extra vendor lib
 */

(function (window, site, handlebars) {
  'use strict';

  var C = site.commands;
  var H = site.helpers;
  var REGIONS = site.context.regions;
  var REGION = site.context.settings.region;

  var helpers = site.helpers = {};
  Swag.registerHelpers(Handlebars);

  //this function will prevent the default and propagation actions
  helpers.stopEvents = function(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  //function
  helpers.getFormData = function(form){
    var params = $(form).serializeArray();
    var thisObj = _.reduce(params , function(obj,param) {
     obj[param.name] = param.value
     return obj;
    }, {});
    return thisObj;
  }


  //this function will close an open modal
  helpers.closeModal = function() {
    C.run('modal:close');
  }

  helpers.params = function () {
    return window.location.search
      .replace(/^\?/, '')
      .split('&')
      .reduce(function (m, x) {
        var parts = x.split('=', 2);
        var name = parts[0];
        var value = decodeURIComponent(parts[1]);
        m[name] = value;
        return m;
      }, {});
  };

  helpers.slugify = function(data){
    return data
        .toLowerCase()
        .replace(/[^\w ]+/g,'')
        .replace(/ +/g,'-');
  }

  helpers.param = function (name) {
    return helpers.params()[name];
  };

  helpers.renderPartial = function (name, args) {
    try {
      var key = 'partials/' + name;
      if (!site.partials[key]) throw new Error('Can’t find partial named ' + name);
      args = _.extend({}, args, _.omit(site.context, 'data'));
      return site.partials[key](args);
    } catch (e) {
      // Handlebars throws exceptions... what a jerk.
      console.log('renderPartial encountered an exception', e, name, args);
    }
  };

  /*
   * @function timeOutModal
   * Closes any modal after a given amount of time
   * expecting time in mil seconds > 5 sec default
  */
  helpers.timeOutModal = function(time) {
    var time_input = time || 5000
    setTimeout(function() {
      C.run('modal:close');
    }, time_input);
  };

  helpers.is2XX = function(xhr) {
    if (xhr.status >= 200 && xhr.status < 300) return true;
    return false;
  }

  /*
  -- check to see if a user is logged in
  */
  helpers.userCheck = function() {
    //get the user as a var
    var user = site.me.getDetails();
    //if there is a user return true else false
    if (user) {
      return true;
    } else {
      return false;
    }
  }

  helpers.scrollToTop = function(){
    var body = $("html, body");
    body.stop().animate({scrollTop:0}, 500, 'swing');
  }

  helpers.toggleHTMLClass = function(className) {
    $('html').toggleClass(className);
  }

  helpers.compileString = function(toBeCompiled) {
    var subTemplate = Handlebars.compile(toBeCompiled);
    var rendered = subTemplate(site.context.data.root);
    var safeRenderd = new Handlebars.SafeString(rendered);
    return safeRenderd;
  }

  helpers.isHomePage = function(){
    return site.context.pageSettings.relativeUrl.length == 0;
  }

})(window, window.site, window.Handlebars);
