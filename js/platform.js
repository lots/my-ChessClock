/*!
 * platform.js - Small device helpers: sound, haptics, screen wake lock, fullscreen
 * and a safe localStorage wrapper. Everything degrades silently when a browser
 * does not support it.
 */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------- storage */

  var Store = {
    get: function (key, fallback) {
      try {
        var raw = global.localStorage.getItem(key);
        if (raw === null || raw === undefined) return fallback;
        return JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { global.localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    },
    remove: function (key) {
      try { global.localStorage.removeItem(key); } catch (e) { /* ignore */ }
    }
  };

  /* ------------------------------------------------------------------ sound */

  var Sound = {
    enabled: true,
    ctx: null,

    _ctx: function () {
      if (this.ctx) return this.ctx;
      var Ctor = global.AudioContext || global.webkitAudioContext;
      if (!Ctor) return null;
      try { this.ctx = new Ctor(); } catch (e) { this.ctx = null; }
      return this.ctx;
    },

    /** Browsers only allow audio after a gesture; call this from a click handler. */
    unlock: function () {
      var ctx = this._ctx();
      if (!ctx) return;
      if (ctx.state === 'suspended' && ctx.resume) { try { ctx.resume(); } catch (e) { /* ignore */ } }
    },

    _beep: function (freq, ms, gain, type, delay) {
      if (!this.enabled) return;
      var ctx = this._ctx();
      if (!ctx) return;
      var at = ctx.currentTime + (delay || 0);
      var osc = ctx.createOscillator();
      var amp = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, at);
      // Short fade in/out keeps the tone clean instead of clicking.
      amp.gain.setValueAtTime(0.0001, at);
      amp.gain.exponentialRampToValueAtTime(gain, at + 0.008);
      amp.gain.exponentialRampToValueAtTime(0.0001, at + ms / 1000);
      osc.connect(amp);
      amp.connect(ctx.destination);
      osc.start(at);
      osc.stop(at + ms / 1000 + 0.02);
    },

    /** Crisp lever click: two short high blips. */
    click: function () {
      this._beep(1180, 32, 0.18, 'square', 0);
      this._beep(760, 46, 0.12, 'square', 0.035);
    },

    /** Soft single tick for the final ten seconds. */
    warn: function () { this._beep(880, 70, 0.16, 'sine', 0); },

    /** Three rising tones when a flag falls. */
    flag: function () {
      this._beep(880, 190, 0.28, 'sine', 0);
      this._beep(1100, 190, 0.28, 'sine', 0.22);
      this._beep(1400, 430, 0.30, 'sine', 0.44);
    },

    /** Two descending tones when the main time runs out and byo-yomi begins. */
    byoStart: function () {
      this._beep(820, 120, 0.22, 'sine', 0);
      this._beep(600, 180, 0.22, 'sine', 0.14);
    },

    /** A lower double thud when a whole byo-yomi period is lost. */
    periodLost: function () {
      this._beep(430, 150, 0.26, 'square', 0);
      this._beep(320, 230, 0.24, 'square', 0.16);
    },

    /** Fifth tone for the countdown beeps at one second intervals. */
    countdown: function (secondsLeft) {
      var base = 620 + (10 - Math.min(10, secondsLeft)) * 46;
      this._beep(base, 90, 0.2, 'sine', 0);
    }
  };

  /* --------------------------------------------------------------- haptics */

  var Haptics = {
    enabled: true,
    _vibrate: function (pattern) {
      if (!this.enabled) return;
      if (global.navigator && typeof global.navigator.vibrate === 'function') {
        try { global.navigator.vibrate(pattern); } catch (e) { /* ignore */ }
      }
    },
    click: function () { this._vibrate(18); },
    warn: function () { this._vibrate(35); },
    period: function () { this._vibrate([90, 70, 90]); },
    flag: function () { this._vibrate([220, 110, 220, 110, 420]); }
  };

  /* -------------------------------------------------------------- wake lock */

  var WakeLock = {
    enabled: true,
    _sentinel: null,
    _wanted: false,

    supported: function () {
      return !!(global.navigator && 'wakeLock' in global.navigator);
    },

    request: function () {
      this._wanted = true;
      if (!this.enabled) return;
      if (!this.supported()) return;
      var self = this;
      if (this._sentinel) return;
      try {
        global.navigator.wakeLock.request('screen').then(function (sentinel) {
          self._sentinel = sentinel;
          sentinel.addEventListener && sentinel.addEventListener('release', function () {
            self._sentinel = null;
            // The browser releases the lock whenever the page is hidden; take it
            // back as soon as we are visible and it is still wanted.
            if (self._wanted && self.enabled && document.visibilityState === 'visible') {
              setTimeout(function () { self.request(); }, 300);
            }
          });
        }).catch(function () { self._sentinel = null; });
      } catch (e) { /* ignore */ }
    },

    release: function () {
      this._wanted = false;
      var s = this._sentinel;
      this._sentinel = null;
      if (s && s.release) { try { s.release(); } catch (e) { /* ignore */ } }
    },

    /** Re-acquire after the tab returns to the foreground. */
    reacquire: function () {
      if (this._wanted && this.enabled && !this._sentinel) this.request();
    }
  };

  /* ------------------------------------------------------------- fullscreen */

  var Fullscreen = {
    supported: function () {
      var el = document.documentElement;
      return !!(el.requestFullscreen || el.webkitRequestFullscreen);
    },
    isOn: function () {
      return !!(document.fullscreenElement || document.webkitFullscreenElement);
    },
    enter: function () {
      var el = document.documentElement;
      var fn = el.requestFullscreen || el.webkitRequestFullscreen;
      if (!fn) return Promise.resolve(false);
      try {
        var r = fn.call(el, { navigationUI: 'hide' });
        return (r && r.then) ? r.then(function () { return true; }).catch(function () { return false; }) : Promise.resolve(true);
      } catch (e) { return Promise.resolve(false); }
    },
    exit: function () {
      var fn = document.exitFullscreen || document.webkitExitFullscreen;
      if (!fn) return Promise.resolve(false);
      try {
        var r = fn.call(document);
        return (r && r.then) ? r.then(function () { return true; }).catch(function () { return false; }) : Promise.resolve(true);
      } catch (e) { return Promise.resolve(false); }
    },
    toggle: function () { return this.isOn() ? this.exit() : this.enter(); }
  };

  global.Platform = { Store: Store, Sound: Sound, Haptics: Haptics, WakeLock: WakeLock, Fullscreen: Fullscreen };
})(window);
