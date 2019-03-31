'use strict';

var Handlebars = require('handlebars');

module.exports = function (context) {
  var root = context.data.root;
  var wl = root.settings.wl
  var templateContent = Handlebars.partials['templates/footer/' + wl]
  var subTemplate = Handlebars.compile(templateContent);
  var rendered = subTemplate(context.data.root);
  return new Handlebars.SafeString(rendered);
}
