var Handlebars = require('handlebars');

module.exports = function (context) {
  return new Handlebars.SafeString(JSON.stringify(context));
};
