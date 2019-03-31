'use strict';

const UglifyJS = require('uglify-js');
const cssmin = require('cssmin');

// in dev mode, use `SQUISH=1 npm run dev` to enable concatenation and minification
const squishable = ('NODE_ENV' in process.env && process.env.NODE_ENV === 'prod') || !!process.env.SQUISH;

console.log('concatenation & minification: ' + (squishable ? 'ENABLED!' : 'DISABLED'));

function squishJavascript (src) {
  if (!squishable) return src;
  try {
    const ast = UglifyJS.parse(src);
    ast.figure_out_scope();
    const compressor = UglifyJS.Compressor({warnings: false});
    const compressed_ast = ast.transform(compressor);
    compressed_ast.figure_out_scope();
    compressed_ast.compute_char_frequency();
    compressed_ast.mangle_names();
    const code = compressed_ast.print_to_string();
    return code;
  } catch (e) {
    return src;
  }
  return src;
}

function squishCss (src) {
  if (!squishable) return src;
  return cssmin(src);
}

module.exports = {
  js: squishJavascript,
  css: squishCss,
  squishable: squishable
};
