/*!
 * themes.js - The three colour themes.
 *
 * Every visual token lives in CSS custom properties, so a theme is nothing but a
 * set of variables on <html data-theme="...">. The clock screens expose the same
 * tokens to JavaScript through THEMES[...].swatch for the preview dots.
 */
(function (global) {
  'use strict';

  var STORE_KEY = 'cc.theme';
  var ORDER = ['classic', 'midnight', 'contrast'];

  var THEMES = {
    classic: {
      id: 'classic',
      // Tournament ivory + deep board green, like a wooden DGT clock.
      swatch: '#1f6b4a',
      f7Theme: 'ios',
      dark: false
    },
    midnight: {
      id: 'midnight',
      swatch: '#2bb3e0',
      f7Theme: 'ios',
      dark: true
    },
    contrast: {
      id: 'contrast',
      swatch: '#ffd400',
      f7Theme: 'md',
      dark: true
    }
  };

  var current = 'classic';
  var listeners = [];

  var Themes = {
    order: ORDER,
    all: THEMES,

    get current() { return current; },

    get info() { return THEMES[current]; },

    isDark: function () { return !!THEMES[current].dark; },

    set: function (id) {
      if (!THEMES[id]) id = 'classic';
      current = id;
      var html = document.documentElement;
      html.setAttribute('data-theme', id);
      html.setAttribute('data-theme-dark', THEMES[id].dark ? 'yes' : 'no');
      // Tell Framework7 / the browser whether this theme is a dark UI, so native
      // form controls, scrollbars and the status bar follow along.
      html.style.colorScheme = THEMES[id].dark ? 'dark' : 'light';
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', id === 'classic' ? '#f4efe6' : (id === 'midnight' ? '#080d13' : '#000000'));
      try { global.localStorage && global.localStorage.setItem(STORE_KEY, id); } catch (e) { /* ignore */ }
      for (var i = 0; i < listeners.length; i++) {
        try { listeners[i](id); } catch (e) { /* keep going */ }
      }
      return current;
    },

    cycle: function () {
      var i = ORDER.indexOf(current);
      return Themes.set(ORDER[(i + 1) % ORDER.length]);
    },

    onChange: function (fn) { listeners.push(fn); },

    init: function () {
      var saved = null;
      try { saved = global.localStorage && global.localStorage.getItem(STORE_KEY); } catch (e) { /* ignore */ }
      return Themes.set(THEMES[saved] ? saved : 'classic');
    }
  };

  global.Themes = Themes;
})(window);
