'use strict';

var Handlebars = require('handlebars');

module.exports = function (source, context) {
  try {
    return new Handlebars.SafeString(Handlebars.compile(source || '')(context.data.root));
  } catch (e) {
    console.log(source, context, e);
  }
};
