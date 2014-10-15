define(['core'], function(core) {
  "use strict";
  /**
   * Adds the hook for focus highlight.
   */
  var addKeyboardHook = function () {
    document.querySelector('html').classList.add('keyboard');
    document.removeEventListener('keydown', addKeyboardHook);
  };

  var init = function () {
    document.addEventListener('keydown', addKeyboardHook);
  };

  core.register(init);
});

/**
 * Handler for Cookies.
 */
define(function() {
  "use strict";

  var submodule = {};

  // Aliasing to keep JSHint happy.
  var escape = window.escape,
      unescape = window.unescape;
  /**
   * Gets an item from the cookie jar.
   *
   * @param key {String} Key of item to get.
   */
  submodule.getItem = function (key) {
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
  submodule.setItem = function (key, value, end, path, domain, secure) {
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
          if (end.hasOwnProperty("toGMTString")) {
            expires = ";expires=" + end.toGMTString();
          }
          break;
      }
    }
    document.cookie = escape(key) + "=" + escape(value) + expires + (domain ? ";domain=" + domain : "") + (path ? ";path=" + path : "") + (secure ? ";secure" : "");
  };

  /**
   * Removes an item from the cookie jar.
   *
   * @param key {String} Key of item to remove.
   */
  submodule.removeItem = function (key) {
    if (!key || !this.hasItem(key)) { return; }
    document.cookie = escape(key) + "=;expires=Thu, 01-Jan-1970 00:00:01 GMT;";
  };

  /**
   * Check for presence of a key in the cookie jar.
   *
   * @param key {String} Key to look for.
   */
  submodule.hasItem = function (key) {
    return (new RegExp("(?:^|;\\s*)" + escape(key).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
  };

  return submodule;

});

define(['core', 'cookies', 'sessionStorage'], function(module, cookies, sessionStorage) {
  "use strict";

  var submodule = {};
  var vars = {},
      url,
      timing = !!(typeof window.performance !== "undefined" && typeof window.performance.timing !== "undefined");

  /**
   * Adds a variable to the internal register.
   *
   * @param name {String} Name of variable to add.
   * @param value {String} Value of variable.
   */
  submodule.addVar = function (name, value) {
    if (typeof name === "string") {
      vars[name] = value;
    }
    else if (typeof name === "object") {
      var data = name,
          key;
      for (key in data) {
        if (data.hasOwnProperty(key)) {
          vars[key] = data[key];
        }
      }
    }
  };

  // Add some information we know at this stage.
  submodule.addVar({
    'noscript': 0,
    'r': document.referrer,
    'u': window.location.href
  });

  submodule.addVar({
    'b_height': window.document.documentElement['clientHeight'],
    'b_width': window.document.documentElement['clientWidth']
  });

  /**
   * Sends the tracking data.
   */
  var sendBeacon = function () {
    var params = [],
        seperator = '?',
        key, img;
    if (vars && url) {
      if (url.search(/\?/) > -1) {
        // There's already a '?' in the URL so we need to add params.
        seperator = '&';
      }
      for (key in vars) {
        if (vars.hasOwnProperty(key)) {
          params.push(key + '=' + encodeURIComponent(vars[key]));
        }
      }
      img = new Image();
      img.src = url + seperator + params.join('&');
    }
  };

  /**
   * Initialise submodule and set vars known at DOMReady.
   */
  var init = function () {
    var t_done;
    if (module.config.hasOwnProperty('beacon_url')) {
      url = module.config.beacon_url;
    }
    if (true) { //TODO - fix debug.
      // If we're in debug mode then we expose the vars for testing.
      submodule.getVars = function () {
        return vars;
      };
    }
    if (!timing) {
      // Need to use storage to get the navigation start time.
      window.addEventListener('beforeunload', function () {
        if (sessionStorage.supported) {
          sessionStorage.setItem('t_navigation_start', new Date().getTime());
        } else {
          cookies.setItem('t_navigation_start', new Date().getTime(), false, '/');
        }
      });
    }
    if (timing) {
      // Override any in-page timer.
      window.t_pagestart = window.performance.timing.responseEnd;
    }
    if (!window.t_domready) {
      if (timing) {
        window.t_domready = window.performance.timing.domInteractive;
      } else {
        window.t_domready = new Date().getTime(); // Hit and hope.
      }
    }
  };
  module.register(init);

  /**
   * Final timing values and send beacon.
   */
  var main = function() {
    var t_onload = window.t_onload || new Date().getTime(), // Should have been set but if not then hit and hope.
        t_navigation_start,
        t_done,
        onload;

    // Collect the remaining timing data.
    if (timing) {
      t_onload = window.performance.timing.loadEventStart;
      t_done = window.performance.timing.responseEnd - window.performance.timing.navigationStart;
      onload = t_onload - window.t_pagestart;
    } else {
      // Pull the navigation start from storage if we have it.
      if (sessionStorage.supported) {
        t_navigation_start = sessionStorage.getItem('t_navigation_start');
      } else {
        t_navigation_start = cookies.getItem('t_navigation_start');
      }
      // Collect data if available.
      if (t_navigation_start && window.t_pagestart) {
        t_done = window.t_pagestart - t_navigation_start;
        onload = t_onload - window.t_pagestart;
      }
    }

    // Now we have the data we set the variables.
    if (window.t_pagestart && window.t_domready) {
      submodule.addVar('t_domready', window.t_domready - window.t_pagestart);
      if (window.t_headend) {
        submodule.addVar('t_head', window.t_headend - window.t_pagestart);
        if (window.t_bodyend) {
          submodule.addVar('t_body', window.t_bodyend - window.t_headend);
        }
      }
    }
    if (t_done) {
      submodule.addVar('t_done', t_done);
    }
    if (onload) {
      submodule.addVar('t_onload', onload);
    }
    if (window.t_jsstart && window.t_jsend) {
      submodule.addVar('t_js', window.t_jsend - window.t_jsstart);
    }
    if (window.t_cssstart && window.t_cssend) {
      submodule.addVar('t_css', window.t_cssend - window.t_cssstart);
    }

    // Finally, send the data after a delay.
    window.setTimeout(sendBeacon, 500);
  };
  module.registerLoad(function() {
    // Need onload to have had a chance to finish to get timings.
    window.t_onload = new Date();
    window.setTimeout(main, 500);
  });

  submodule.timing = timing;

  return submodule;

});

/**
 * Profiles the runtime environment to check support.
 */
define(['core', 'cookies', 'sessionStorage'], function(module, cookies, sessionStorage) {
  "use strict";

  var submodule = {};

  var image = new Image(),
      html = document.querySelector('html'),
      setProfile,
      script;

  /**
   * Sets the serialised profile as a cookie.
   */
  setProfile = function() {
    if (submodule.profile.json) {
      cookies.setItem('profile', JSON.stringify(submodule.profile), null, '/');
    }
  };

  submodule.profile = submodule.profile || {};
  submodule.profile.profile = true; // We are profiling this environment.

  // SVG support.
  submodule.profile.svg = false;
  if (!!document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1")) {
    submodule.profile.svg = true;
  }

  // Transform CSS prefix.
  module.transform_prefix = '';
  if ('webkitTransform' in image.style) {
    module.transform_prefix = '-webkit-';
    submodule.profile.transform = true;
  } else if ('MozTransform' in image.style) {
    module.transform_prefix = '-moz-';
    submodule.profile.transform = true;
  } else if ('OTransform' in image.style) {
    module.transform_prefix = '-o-';
    submodule.profile.transform = true;
  } else if('transform' in image.style) {
    module.transform_prefix = '';
    submodule.profile.transform = true;
  }
  if (submodule.profile.transform) {
    html.classList.add('transform');
  }

  // Touch support.
  if ('ontouchstart' in window || (typeof navigator.msMaxTouchPoints !== 'undefined' && navigator.msMaxTouchPoints > 0)) {
    submodule.profile.touch = true;
    html.classList.remove('pointer');
  }

  // JSON parser support.
  if (typeof JSON !== 'undefined') {
    submodule.profile.json = true;
  }

  // Asynchronous script support.
  script = document.createElement('script');
  script.setAttribute('async', true);
  submodule.profile.async_scripts = !!script.async;

  // Timing API
  submodule.profile.timing = !!(typeof window.performance !== 'undefined' && typeof window.performance.timing !== 'undefined');

  /**
   * Sends the profile to the server with an ajax request.
   *
   * @param force {Boolean} Force sending even if the profile has already been sent.
   */
  submodule.sendProfile = function (force) {
    if (module.config.debug) {
      return false;
    }
    // TODO: remove for testing.
    function toQueryString(obj) {
      var parts = [];
      for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
          parts.push(encodeURIComponent(i) + "=" + encodeURIComponent(obj[i]));
        }
      }
      return parts.join("&");
    }

    // Send the data to the server on first load - if we don't do this it won't get sent if there's only one page load.
    window.setTimeout(function () {
      // TODO: remove for testing.
      var sent = false,
          url = module.config.profiler_url || '/profile';
      // Connection information
      if (typeof module.load_speed !== 'undefined') {
        submodule.profile.load_speed = module.load_speed;
      }
      if (typeof module.connection_type !== 'undefined') {
        submodule.profile.connection_type = module.connection_type;
      }
      submodule.profile.session_storage = sessionStorage.supported;
      setProfile(); // Make sure it's been set.
      if (submodule.profile.session_storage) {
        sent = !!(sessionStorage.getItem('profile-sent'));
      } else {
        sent = !!(cookies.getItem('profile-sent'));
      }
      if (!sent || force) {
        var httpRequest = new XMLHttpRequest();
        httpRequest.open('GET', url + '?' + toQueryString(submodule.profile), true);
        httpRequest.send(null);
        if (submodule.profile.session_storage) {
          sessionStorage.setItem('profile-sent', 1);
        } else {
          cookies.setItem('profile-sent', 1, null, '/');
        }
      }
    }, 100);
  };

  module.register(submodule.sendProfile);
  module.register(setProfile);

  return submodule.profile;

});

/**
 * Responsive image replacement.
 */
define(['core', 'speedTest', 'profile', 'cookies'], function(module, speedTest, profile, cookies) {

  "use strict";

  var submodule = {};

  var image_replace,
      aws_url,
      getInt,
      responsiveImages,
      imageSrc,
      svgReplace,
      svgSrc,
      init,
      suffix = '_m', // Default to suffix of smallest image.
      suffix_set = false,  //Has the suffix been set? {Boolean}
      s3_bucket = module.config.s3_bucket || 'decadecity';

  aws_url = '//s3-eu-west-1.amazonaws.com/' + s3_bucket + '/images/';
  image_replace = new RegExp('^' + aws_url + '([^_.]*).*\\.(.*)$'); // Regex to break up an image URL.

  /**
   * Sanitiser for parseInt that will cope with NaN.
   *
   * @param number {Integer|String} Input to be sanitised.
   */
  getInt = function(number) {
    number = parseInt(number, 10);
    if (isNaN(number)) {
      number = 0;
    }
    return number;
  };

  /**
   * Replaces an image URL with the suffix set for the environment.
   *
   * @param src {String} image URL.
   *
   * @return {String} Image with suffix set.
   */
  imageSrc = function (src) {
    var match, secure;
    src = src.replace(/^http(s)?:/, '');
    src = src.replace('file:', '');
    match = image_replace.exec(src);
    if (!match) {
      return src;
    }
    return aws_url + match[1] + suffix + '.' + match[2];
  };

  /**
   * Sets the SVG url of an image.
   */
  svgSrc = function(src) {
    return src.replace(/\.[^.\?]*($|\?)/, '.svg$1');
  };

  /**
   * Replaces the source of imges with a class of .svg-replace with an SVG.
   */
  svgReplace = function () {
    if (profile.svg) {
      var images = document.querySelectorAll('.svg-replace');
      for (var i = 0; i < images.length; i += 1) {
        var image = images[i];
        image.src = svgSrc(image.src);
        image.classList.remove('svg-replace');
      }
    }
  };

  /**
   * Replaces any image with a class of .responsive with the appropriate size image for the environment.
   */
  responsiveImages = function () {
    var images = document.querySelectorAll('img.responsive');

    if (images.length) {
      var holder, clearHolder;

      // 'Invisible' holder into which the replacement images can be loaded.
      holder = document.createElement('div');
      /**
       * Clears the cache image holder if it is empty.
       */
      clearHolder = function() {
        if (holder.querySelectorAll('img').length === 0) {
          if (holder.parentElement) {
            holder.parentElement.removeChild(holder);
          }
        }
      };


      // Go through each responsive image and swap it out with the appropriate image.
      Array.prototype.forEach.call(images, function(content_img) {
        var src = content_img.src,
            new_src = imageSrc(src), // URL of the replacement image.
            cache_img; // Cache image we will use to load the new image.
        if (src === new_src) {
          // Nothing doing.
          return src;
        }
        cache_img = document.createElement('img');

        var imageLoadedHandler = function(e) {
          // Once the image has loaded in the hidden version we replace the original image as it should be in the browser cache.
          content_img.src = new_src;
          if (cache_img.parentElement) {
            cache_img.removeEventListener('load', imageLoadedHandler); // Not sure this is correct?
            cache_img.parentElement.removeChild(cache_img); // Don't need the cache image anymore.
          }
          clearHolder();
        };

        // We need to load the image to prevent a big jump as the old src is switched out for a src that hasn't been loaded.
        cache_img.addEventListener('load', imageLoadedHandler);
        cache_img.src = new_src;
        holder.appendChild(cache_img); // Inject the new image into the DOM and get the browser to load it.
      });
      clearHolder(); // Clean up if there were no images to insert.
    }
  };

  /**
   * Work out the suffix for this environment and run the replacement.
   *
   * Accepts arguments for testing.
   *
   * @param width {Number} Width of environment to take account of.
   * @param height {Number} Height of environment to take account of.
   * @param pixel_density {Number} Pixel density of display.
   * @param speed {String} Connection speed [fast|slow].
   */
  init = function (width, height, pixel_density, speed) {
    var window_width;

    speedTest.ready();
    if (typeof profile.load_speed !== 'undefined' && typeof speed === 'undefined') {
      speed = profile.load_speed;
    }

    if (!suffix_set) {
      // This has already been run so don't do it again.

      width = width || window.document.documentElement['clientWidth'];
      height = height || window.document.documentElement['clientHeight'];
      pixel_density = pixel_density || getInt(window.devicePixelRatio) || 1;

      window_width = Math.max(width, height); // Take max to allow for orientation change.
      window_width = window_width * pixel_density; // Take account of a better screen resolution.
      window_width = getInt(window_width);
      if (speed !== 'fast') {
        speed = 'slow';
      }

      // This sorts out the flickr naming convention based on image width.
      if (window_width < 280 || speed === 'slow') {
        suffix = '_m';
      } else if (window_width < 320) {
        suffix = '_n';
      } else if (window_width < 500) {
        suffix = '';
      } else if (window_width < 640) {
        suffix = '_z';
      } else if (window_width < 800) {
        suffix = '_c';
      } else {
        suffix = '_b';
      }
      if (typeof profile === 'object') {
        // Store this in the profile.
        profile.image_suffix = suffix;
      }
      cookies.setItem('image_suffix', suffix, null, '/');
      suffix_set = true;
    }
    responsiveImages();
    svgReplace();
  };

  // Open up some internal items for debugging.
  submodule.ready = init;
  submodule.imageSrc = imageSrc;
  submodule.responsiveImages = responsiveImages;
  submodule.suffix = function (value) { if (typeof value !== 'undefined') { suffix = value; } else { return suffix; }};
  submodule.suffix_set = function (value) { if (typeof value !== 'undefined') { suffix_set = !!(value); } else { return suffix_set; }};
  submodule.svgSrc = svgSrc;
  submodule.svgReplace = svgReplace;

  return submodule;

});
