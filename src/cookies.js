/**
 * Handler for Cookies.
 */
define(function(require, exports, module) {
  "use strict";

  var config = require('config');

  module.exports = {};

  // Aliasing to keep JSHint happy.
  var escape = window.escape,
      unescape = window.unescape;
  /**
   * Gets an item from the cookie jar.
   *
   * @param key {String} Key of item to get.
   */
  module.exports.getItem = function(key) {
    if (!key || !this.hasItem(key)) {
      return null;
    }
    return unescape(document.cookie.replace(new RegExp("(?:^|.*;\\s*)" + escape(key).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*"), "$1"));
  };

  /**
   * Puts an item into the cookie jar.
   *
   * @param key {String} Key of item to store.
   * @param value {String} Value to store.
   * @param end {Number|String|Date} Expiry information, if number it will be max-age otherwise expires.  Set to falsy for session cookie.
   * @param path {String} Path for cookie scope.
   * @param domain {String} Domain for cookie scope.
   * @param secure {Boolean} Is this a secure cookie.
   */
  module.exports.setItem = function(key, value, end, path, domain, secure) {
    if (!key || /^(?:expires|max\-age|path|domain|secure)$/.test(key)) {
      return;
    }
    var expires = "";
    if (end) {
      switch (typeof end) {
        case "number":
          expires = "; max-age=" + end;
          break;
        case "string":
          expires = "; expires=" + end;
          break;
        case "object":
          /* istanbul ignore else  */
          if (typeof end.toUTCString === 'function') {
            expires = ";expires=" + end.toUTCString();
          }
          break;
      }
    }
    document.cookie = escape(key) + "=" + escape(value) + expires + (domain ? ";domain=" + domain : "") + (path ? ";path=" + path : "") + (secure ? ";secure" : "");
    // Return a success code.
    return true;
  };

  /**
   * Removes an item from the cookie jar.
   *
   * @param key {String} Key of item to remove.
   */
  module.exports.removeItem = function(key) {
    if (!key || !this.hasItem(key)) { return; }
    document.cookie = escape(key) + "=;expires=Thu, 01-Jan-1970 00:00:01 GMT;";
  };

  /**
   * Check for presence of a key in the cookie jar.
   *
   * @param key {String} Key to look for.
   */
  module.exports.hasItem = function(key) {
    return (new RegExp("(?:^|;\\s*)" + escape(key).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
  };

});
