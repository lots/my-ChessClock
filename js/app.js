/*!
 * app.js - CoQ Weiqi/Chess Clock application controller.
 *
 * Brings together: Framework7 (shell, router, popup, dialogs), the i18n layer,
 * the theme layer, the timing engine and the platform helpers.
 */
(function (global) {
  'use strict';

  var Store = Platform.Store;
  var Sound = Platform.Sound;
  var Haptics = Platform.Haptics;
  var WakeLock = Platform.WakeLock;
  var Fullscreen = Platform.Fullscreen;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ------------------------------------------------------------- constants */

  var DEFAULT_SETTINGS = {
    sound: true,
    vibrate: true,
    warnBeeps: true,
    wake: true,
    fullscreen: false,
    faceToFace: true,
    dim: true
  };

  var PRESETS = {
    simple:    [[1, 0], [3, 0], [5, 0], [10, 0], [15, 0], [30, 0], [60, 0]],
    increment: [[3, 2], [5, 3], [10, 5], [15, 10], [25, 10], [60, 30], [90, 30]],
    delay:     [[3, 2], [5, 3], [10, 5], [25, 5], [30, 10], [60, 10]],
    // main minutes, number of periods, period seconds
    byoyomi:   [[5, 3, 20], [10, 3, 30], [15, 3, 30], [20, 5, 30], [30, 5, 30], [30, 3, 60], [60, 5, 60]]
  };

  var DEFAULT_CONTROL = { mode: 'simple', baseMs: 5 * 60000, bonusMs: 0, periods: 5, names: ['', ''] };

  /* ---------------------------------------------------------------- state */

  var settings = merge(DEFAULT_SETTINGS, Store.get('cc.settings', {}));
  var control = merge(DEFAULT_CONTROL, Store.get('cc.control', {}));
  if (ChessClock.MODES.indexOf(control.mode) < 0) control.mode = 'simple';
  if (!Array.isArray(control.names)) control.names = ['', ''];
  control.periods = clampInt(control.periods, 1, 99, 5);

  var app = null;
  var clock = null;
  var popup = null;
  var lastLen = [0, 0];
  var els = {};

  function merge(base, extra) {
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    if (extra && typeof extra === 'object') {
      Object.keys(extra).forEach(function (k) {
        if (extra[k] !== undefined && extra[k] !== null) out[k] = extra[k];
      });
    }
    return out;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function clampInt(value, lo, hi, fallback) {
    var n = parseInt(value, 10);
    if (!isFinite(n)) n = fallback;
    return Math.max(lo, Math.min(hi, n));
  }

  function describeControl() {
    return ChessClock.describe({
      baseMs: control.baseMs,
      bonusMs: control.bonusMs,
      periods: control.periods,
      mode: control.mode
    });
  }

  function saveControl() {
    Store.set('cc.control', {
      mode: control.mode,
      baseMs: control.baseMs,
      bonusMs: control.bonusMs,
      periods: control.periods,
      names: [control.names[0] || '', control.names[1] || '']
    });
  }

  function saveSettings() { Store.set('cc.settings', settings); }

  function playerName(i) {
    var n = (control.names[i] || '').trim();
    return n || I18n.t('clock.p' + (i + 1));
  }

  /* ======================================================== menu page logic */

  var menu = {};

  function renderModeRow() {
    $$('[data-seg="mode"] .button', menu.page).forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-mode') === control.mode);
    });
    var desc = $('#cc-mode-desc', menu.page);
    if (desc) desc.textContent = I18n.t('mode.' + control.mode + '.desc');

    var bonusKey = control.mode === 'delay' ? 'time.delay'
      : (control.mode === 'byoyomi' ? 'time.byoPeriod' : 'time.increment');
    var bonusLabel = $('#cc-bonus-label', menu.page);
    if (bonusLabel) bonusLabel.textContent = I18n.t(bonusKey);

    showField('[data-field="bonus"]', control.mode !== 'simple');
    showField('[data-field="periods"]', control.mode === 'byoyomi');
  }

  function showField(selector, visible) {
    var el = $(selector, menu.page);
    if (el) el.classList.toggle('is-hidden', !visible);
  }

  function presetLabel(mode, p) {
    if (mode === 'byoyomi') return p[0] + '+' + p[1] + '\u00d7' + p[2];
    return p[0] + '+' + p[1];
  }

  function renderPresets() {
    var host = $('#cc-presets', menu.page);
    if (!host) return;
    var mode = control.mode;
    var list = PRESETS[mode] || PRESETS.simple;
    var minutes = Math.round(control.baseMs / 60000);
    var bonus = Math.round(control.bonusMs / 1000);
    host.innerHTML = list.map(function (p) {
      var active = p[0] === minutes && (mode === 'byoyomi'
        ? (p[1] === control.periods && p[2] === bonus)
        : (mode === 'simple' || p[1] === bonus));
      return '<button type="button" class="cc-preset' + (active ? ' is-active' : '') +
        '" data-preset="' + p.join('-') + '">' + presetLabel(mode, p) + '</button>';
    }).join('');
  }

  function renderControlFields() {
    if (menu.minutes) menu.minutes.value = String(Math.round(control.baseMs / 60000));
    if (menu.bonus) menu.bonus.value = String(Math.round(control.bonusMs / 1000));
    if (menu.periods) menu.periods.value = String(control.periods);
    var summary = $('#cc-summary', menu.page);
    if (summary) summary.textContent = describeControl();
  }

  function renderThemes() {
    $$('[data-seg="theme"] .cc-theme', menu.page).forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-theme-id') === Themes.current);
    });
  }

  function renderLang() {
    $$('[data-seg="lang"] .button', menu.page).forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-lang') === I18n.lang);
    });
  }

  function renderControlUI() {
    if (!menu.page) return;
    renderLang();
    renderThemes();
    renderModeRow();
    renderPresets();
    renderControlFields();
  }

  function setControlFromMinutes() {
    var mins = clampInt(menu.minutes.value, 1, 180, 5);
    var floor = control.mode === 'byoyomi' ? 1 : 0;
    var bonus = control.mode === 'simple' ? 0 : clampInt(menu.bonus.value, floor, 600, floor);
    control.baseMs = mins * 60000;
    control.bonusMs = bonus * 1000;
    if (menu.periods) control.periods = clampInt(menu.periods.value, 1, 99, 5);
    menu.minutes.value = String(mins);
    menu.bonus.value = String(bonus);
    if (menu.periods) menu.periods.value = String(control.periods);
    saveControl();
    renderPresets();
    renderControlFields();
  }

  function wireMenu(page) {
    menu.page = page;
    menu.minutes = $('#cc-minutes', page);
    menu.bonus = $('#cc-bonus', page);
    menu.periods = $('#cc-periods', page);

    $$('[data-seg="lang"] .button', page).forEach(function (b) {
      b.addEventListener('click', function () { I18n.set(b.getAttribute('data-lang')); });
    });

    $$('[data-seg="theme"] .cc-theme', page).forEach(function (b) {
      b.addEventListener('click', function () { Themes.set(b.getAttribute('data-theme-id')); });
    });

    $$('[data-seg="mode"] .button', page).forEach(function (b) {
      b.addEventListener('click', function () {
        control.mode = b.getAttribute('data-mode');
        if (control.mode === 'simple') control.bonusMs = 0;
        else if (control.bonusMs === 0) control.bonusMs = control.mode === 'byoyomi' ? 30000 : 5000;
        control.baseMs = clampInt(menu.minutes.value, 1, 180, 5) * 60000;
        saveControl();
        renderModeRow();
        renderPresets();
        renderControlFields();
      });
    });

    $('#cc-presets', page).addEventListener('click', function (ev) {
      var btn = ev.target.closest ? ev.target.closest('.cc-preset') : null;
      if (!btn) return;
      var parts = btn.getAttribute('data-preset').split('-').map(function (n) { return parseInt(n, 10); });
      control.baseMs = parts[0] * 60000;
      if (control.mode === 'byoyomi') {
        control.periods = parts[1];
        control.bonusMs = parts[2] * 1000;
      } else {
        control.bonusMs = control.mode === 'simple' ? 0 : parts[1] * 1000;
      }
      saveControl();
      renderPresets();
      renderControlFields();
    });

    $$('[data-stepper]', page).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var which = btn.getAttribute('data-stepper');
        var delta = parseInt(btn.getAttribute('data-delta'), 10);
        if (which === 'minutes') {
          menu.minutes.value = String(clampInt(menu.minutes.value, 1, 180, 5) + delta);
        } else if (which === 'periods') {
          menu.periods.value = String(clampInt(menu.periods.value, 1, 99, 5) + delta);
        } else {
          var floor = control.mode === 'byoyomi' ? 1 : 0;
          menu.bonus.value = String(clampInt(menu.bonus.value, floor, 600, floor) + delta);
        }
        setControlFromMinutes();
      });
    });

    [menu.minutes, menu.bonus, menu.periods].forEach(function (input) {
      input.addEventListener('change', setControlFromMinutes);
      input.addEventListener('blur', setControlFromMinutes);
    });

    var nameInputs = [$('#cc-name0', page), $('#cc-name1', page)];
    nameInputs.forEach(function (input, i) {
      input.value = control.names[i] || '';
      input.addEventListener('input', function () {
        control.names[i] = input.value.slice(0, 24);
        saveControl();
      });
    });

    $('#cc-swap', page).addEventListener('click', function () {
      var a = nameInputs[0].value;
      nameInputs[0].value = nameInputs[1].value;
      nameInputs[1].value = a;
      control.names = [nameInputs[0].value, nameInputs[1].value];
      saveControl();
    });

    $('#cc-start', page).addEventListener('click', openClock);

    $$('[data-nav]', page).forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        app.views.main.router.navigate(a.getAttribute('data-nav'));
      });
    });
  }

  /* ==================================================== settings page logic */

  function wireSettings(page) {
    $$('[data-setting]', page).forEach(function (input) {
      var key = input.getAttribute('data-setting');
      input.checked = !!settings[key];
      input.addEventListener('change', function () {
        settings[key] = input.checked;
        saveSettings();
        if (key === 'wake') { if (input.checked) WakeLock.request(); else WakeLock.release(); }
        if (key === 'sound') Sound.enabled = input.checked;
        if (key === 'vibrate') Haptics.enabled = input.checked;
        if (key === 'faceToFace' && els.stage) els.stage.setAttribute('data-rot', input.checked ? 'on' : 'off');
        if (key === 'dim' && els.stage) els.stage.setAttribute('data-dim', input.checked ? 'on' : 'off');
      });
    });

    $('#set-test', page).addEventListener('click', function () {
      Sound.unlock();
      Sound.enabled = true;
      Sound.click();
      setTimeout(function () { Sound.countdown(5); }, 260);
      setTimeout(function () { Sound.flag(); }, 620);
      Sound.enabled = settings.sound;
      if (settings.vibrate) Haptics.flag();
    });

    $('#set-defaults', page).addEventListener('click', function () {
      settings = merge(DEFAULT_SETTINGS, {});
      saveSettings();
      applySettingsToDom();
      $$('[data-setting]', page).forEach(function (input) {
        input.checked = !!settings[input.getAttribute('data-setting')];
      });
      Sound.enabled = settings.sound;
      Haptics.enabled = settings.vibrate;
    });
  }

  /**
   * Wiring shared by every page. The router rebuilds each page from a template
   * on every visit, so these listeners are attached per page rather than once.
   */
  function wireCommon(page) {
    $$('[data-act="back"]', page).forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var router = app.views.main.router;
        // A page opened directly by URL has no history to go back to.
        if (router.history && router.history.length > 1) router.back();
        else router.navigate('/');
      });
    });

    var cycle = $('[data-act="cycle-theme"]', page);
    if (cycle) cycle.addEventListener('click', function (e) { e.preventDefault(); Themes.cycle(); });
  }

  function wireHelp(page) {
    // Nothing dynamic; the i18n pass in pageInit fills every tagged node.
    void page;
  }

  function applySettingsToDom() {
    Sound.enabled = settings.sound;
    Haptics.enabled = settings.vibrate;
    if (els.stage) {
      els.stage.setAttribute('data-rot', settings.faceToFace ? 'on' : 'off');
      els.stage.setAttribute('data-dim', settings.dim ? 'on' : 'off');
    }
  }

  /* ======================================================== the clock screen */

  function fitTime(sideEl) {
    var wrap = $('.cc-time-wrap', sideEl);
    var span = $('.cc-time', sideEl);
    if (!wrap || !span) return;
    var availW = wrap.clientWidth;
    var availH = wrap.clientHeight;
    if (!availW || !availH) return;
    // Measure the digits at a known size, then scale them to the space we have.
    span.style.fontSize = '100px';
    var rect = span.getBoundingClientRect();
    if (!rect.width || !rect.height) { span.style.fontSize = ''; return; }
    var padW = Math.max(6, availW * 0.06);
    var padH = Math.max(4, availH * 0.12);
    var size = 100 * Math.min((availW - padW) / rect.width, (availH - padH) / rect.height);
    span.style.fontSize = Math.max(18, Math.min(size, 460)).toFixed(1) + 'px';
  }

  function fitTimes() {
    if (!els.sides) return;
    els.sides.forEach(fitTime);
  }

  function renderClock(snap) {
    if (!els.stage) return;
    els.stage.setAttribute('data-status', snap.status);
    for (var i = 0; i < 2; i++) {
      var side = els.sides[i];
      if (!side) continue;
      var nameEl = $('.cc-name', side);
      var label = (snap.config.names[i] || '').trim() || I18n.t('clock.p' + (i + 1));
      if (nameEl.textContent !== label) nameEl.textContent = label;

      var timeEl = $('.cc-time', side);
      var text = snap.text[i];
      if (timeEl.textContent !== text) {
        timeEl.textContent = text;
        if (text.length !== lastLen[i]) { lastLen[i] = text.length; fitTime(side); }
      }

      var countEl = $('.cc-move-count', side);
      var moves = String(snap.moves[i]);
      if (countEl.textContent !== moves) countEl.textContent = moves;

      var flagged = snap.status === 'flagged';
      var live = snap.live[i];
      // Byo-yomi readout: how many periods are left and how long each one is.
      var inByo = !flagged && !!(live && live.inByo);
      var byoEl = $('.cc-byo', side);
      if (byoEl) {
        byoEl.hidden = !inByo;
        if (inByo) {
          var byoLabel = Math.max(0, live.periodsLeft) + ' \u00d7 ' +
            Math.round(live.periodMs / 1000) + I18n.t('clock.secShort');
          if (byoEl.textContent !== byoLabel) byoEl.textContent = byoLabel;
        }
      }
      side.classList.toggle('is-byo', inByo);

      var ms = snap.times[i];
      side.classList.toggle('is-active', !flagged && snap.active === i);
      side.classList.toggle('is-low', !flagged && ms <= 20000);
      side.classList.toggle('is-critical', !flagged && ms <= 10000 && ms > 0);
      side.classList.toggle('is-flagged', flagged && snap.flagged === i);
      side.classList.toggle('is-winner', flagged && snap.flagged !== i);
    }
    renderClockStatus(snap);
  }

  function renderClockStatus(snap) {
    var running = snap.status === 'running';
    if (els.pauseBtn) {
      var wanted = running ? 'pause' : 'play';
      if (els.pauseBtn.getAttribute('data-icon') !== wanted) {
        els.pauseBtn.setAttribute('data-icon', wanted);
        els.pauseBtn.innerHTML = Views.icon(wanted);
      }
      els.pauseBtn.classList.toggle('is-disabled', snap.status === 'ready');
      var key = running ? 'clock.title.pause' : 'clock.title.resume';
      els.pauseBtn.setAttribute('data-i18n-title', key);
      els.pauseBtn.setAttribute('title', I18n.t(key));
      els.pauseBtn.setAttribute('aria-label', I18n.t(key));
    }

    var paused = snap.status === 'paused';
    if (els.center) els.center.hidden = !paused;
    if (els.centerPill) els.centerPill.textContent = I18n.t('clock.paused');

    if (snap.status === 'flagged') {
      renderFlagPanel(snap);
      els.flag.hidden = false;
    } else if (els.flag) {
      els.flag.hidden = true;
    }
  }

  function renderFlagPanel(snap) {
    var loser = snap.flagged;
    var winner = loser === 0 ? 1 : 0;
    var loserName = (snap.config.names[loser] || '').trim() || I18n.t('clock.p' + (loser + 1));
    var winnerName = (snap.config.names[winner] || '').trim() || I18n.t('clock.p' + (winner + 1));
    // A player who runs out of byo-yomi periods lost on the clock too, but the
    // verdict should say so in the terms of the time control being used.
    var verdict = (snap.inByo && snap.inByo[loser]) ? 'clock.flagBodyByo' : 'clock.flagBody';
    $('#cc-flag-body').textContent = I18n.t(verdict, { loser: loserName, winner: winnerName });
    $('#cc-flag-times').innerHTML = [0, 1].map(function (i) {
      var n = (snap.config.names[i] || '').trim() || I18n.t('clock.p' + (i + 1));
      return '<div class="cc-flag-time' + (i === loser ? ' is-flagged' : '') + '">' +
        '<span>' + esc(n) + '</span><b>' + esc(snap.text[i]) + '</b></div>';
    }).join('');
  }

  function openClock() {
    applySettingsToDom();
    setControlFromMinutes();      // normalise the inputs before we start
    // Leaving a game pauses the engine, so a fresh game has to be granted
    // explicitly before the new time control can be applied.
    clock.reset();
    clock.configure({
      mode: control.mode,
      baseMs: control.baseMs,
      bonusMs: control.mode === 'simple' ? 0 : control.bonusMs,
      periods: control.periods,
      names: [playerName(0), playerName(1)]
    });
    lastLen = [0, 0];
    Sound.unlock();
    popup.open();
    if (settings.wake) WakeLock.request();
    if (settings.fullscreen) Fullscreen.enter();
    // Layout is only measurable once the popup is in the document and visible.
    requestAnimationFrame(function () { renderClock(clock.snapshot()); fitTimes(); });
  }

  function closeClock() {
    popup.close();
  }

  function confirmThen(titleKey, textKey, action) {
    app.dialog.confirm(I18n.t(textKey), I18n.t(titleKey), function () { action(); });
  }

  function clockAction(action) {
    if (action === 'pause') {
      clock.togglePause();
      if (clock.status === 'running' && settings.wake) WakeLock.request();
    } else if (action === 'flip') {
      settings.faceToFace = !settings.faceToFace;
      saveSettings();
      applySettingsToDom();
      requestAnimationFrame(fitTimes);
    } else if (action === 'reset') {
      if (clock.status === 'running' || clock.status === 'paused') {
        confirmThen('dialog.reset.title', 'dialog.reset.text', function () { clock.reset(); fitTimes(); });
      } else {
        clock.reset();
        fitTimes();
      }
    } else if (action === 'exit') {
      if (clock.status === 'running' || clock.status === 'paused') confirmThen('dialog.exit.title', 'dialog.exit.text', closeClock);
      else closeClock();
    }
  }

  function onClockKey(ev) {
    if (!popup || !popup.opened) return;
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    var tag = (ev.target && ev.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    var k = ev.key;
    if (k === 'Escape') { ev.preventDefault(); clockAction('exit'); return; }
    if (k === ' ' || k === 'Spacebar') { ev.preventDefault(); clockAction('pause'); return; }
    if (k === 'r' || k === 'R') { ev.preventDefault(); clockAction('reset'); return; }
    if (k === 'f' || k === 'F') { ev.preventDefault(); clockAction('flip'); return; }
    if (k === 'a' || k === 'A' || k === '1' || k === 'ArrowLeft') { ev.preventDefault(); pressSide(0); return; }
    if (k === 'l' || k === 'L' || k === '2' || k === 'ArrowRight') { ev.preventDefault(); pressSide(1); return; }
  }

  function pressSide(side) {
    Sound.unlock();
    if (clock.press(side)) {
      if (settings.sound) Sound.click();
      if (settings.vibrate) Haptics.click();
    }
  }

  function wireClock() {
    var host = $('#cc-clock-host');
    if (!host) return;
    host.innerHTML = Views.clock();
    // The clock is not a router page, so nothing else would ever translate its
    // own labels and button tooltips on a cold load.
    I18n.apply(host);

    clock = ChessClock.create();

    els.stage = $('#cc-stage');
    els.sides = $$('.cc-side');
    els.pauseBtn = $('.cc-mid-btn[data-act="pause"]');
    els.center = $('#cc-center');
    els.centerPill = $('#cc-center-pill');
    els.flag = $('#cc-flag');

    popup = app.popup.create({
      el: '#cc-clock',
      swipeToClose: false,
      closeByBackdrop: false,
      animate: true,
      on: {
        popupOpen: function () { requestAnimationFrame(function () { renderClock(clock.snapshot()); fitTimes(); }); },
        popupClose: function () {
          if (clock.status === 'running' || clock.status === 'paused') clock.pause();
          WakeLock.release();
          if (Fullscreen.isOn()) Fullscreen.exit();
        }
      }
    });

    els.sides.forEach(function (sideEl) {
      var side = parseInt(sideEl.getAttribute('data-side'), 10);
      var fire = function (ev) {
        if (ev.type === 'pointerdown') {
          if (typeof ev.button === 'number' && ev.button > 0) return;
        }
        ev.preventDefault();
        pressSide(side);
      };
      if (global.PointerEvent) sideEl.addEventListener('pointerdown', fire);
      else {
        sideEl.addEventListener('touchstart', fire, { passive: false });
        sideEl.addEventListener('mousedown', fire);
      }
      sideEl.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });

    $$('.cc-mid-btn', host).forEach(function (btn) {
      btn.addEventListener('click', function () { clockAction(btn.getAttribute('data-act')); });
    });

    $('#cc-newgame').addEventListener('click', function () { clock.reset(); fitTimes(); });
    $('#cc-backmenu').addEventListener('click', closeClock);

    clock.on('update', renderClock);
    clock.on('flag', function (snap) {
      if (settings.sound) Sound.flag();
      if (settings.vibrate) Haptics.flag();
      renderClock(snap);
    });
    clock.on('byostart', function () {
      if (settings.sound) Sound.byoStart();
      if (settings.vibrate) Haptics.warn();
    });
    clock.on('period', function () {
      if (settings.sound) Sound.periodLost();
      if (settings.vibrate) Haptics.period();
    });
    clock.on('lowtime', function (info) {
      if (info.seconds > 10) return;
      if (settings.warnBeeps && settings.sound) Sound.countdown(info.seconds);
      if (settings.vibrate) Haptics.warn();
    });

    document.addEventListener('keydown', onClockKey, true);
  }

  /* ============================================================== lifecycle */

  function applyDocumentTitle() {
    var name = I18n.t('app.name');
    document.title = name;
    if (app) app.params.name = name;   // Framework7's own fallback title
  }

  function refreshDynamicText() {
    applyDocumentTitle();
    renderControlUI();
    if (clock) renderClock(clock.snapshot());
    applySettingsToDom();
    // The mode description, presets and flag text are built in JS, so a language
    // change has to rebuild them explicitly.
  }

  function onResize() { requestAnimationFrame(fitTimes); }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    navigator.serviceWorker.register('sw.js').catch(function () { /* offline extras only */ });
  }

  function boot() {
    var menuContent = Views.menu();
    var routes = [
      { path: '/', content: menuContent, on: { pageInit: onPageInit } },
      { path: '/settings/', content: Views.settings(), on: { pageInit: onPageInit } },
      { path: '/help/', content: Views.help(), on: { pageInit: onPageInit } },
      // Anything else - including /index.html and a bookmarked deep link - is
      // the menu, which keeps the app usable from the file system too.
      { path: '(.*)', content: menuContent, on: { pageInit: onPageInit } }
    ];

    app = new Framework7({
      el: '#app',
      name: 'CoQ Weiqi/Chess Clock',
      theme: 'ios',        // one visual language on every device
      darkMode: false,     // the three themes own all colour decisions
      routes: routes
    });

    // Framework7 only instantiates views that carry the view-init class, so the
    // one and only view is created explicitly here.
    if (!app.views.main) app.views.create('.view-main', { main: true, routes: routes });

    wireClock();
    applySettingsToDom();

    // Safety net: if the router has still not produced a page, ask it to.
    if (!$('.page-current')) app.views.main.router.navigate('/');

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', function () { setTimeout(onResize, 260); });
    document.addEventListener('fullscreenchange', onResize);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        WakeLock.reacquire();
        if (clock) clock.refresh();
        onResize();
      }
    });

    applyDocumentTitle();
    I18n.onChange(refreshDynamicText);
    Themes.onChange(function () {
      renderThemes();
    });

    registerServiceWorker();
  }

  // Framework7 route events are called as (event, pageElement).
  function onPageInit(event, page) {
    var el = page && typeof page.querySelectorAll === 'function' ? page : null;
    if (!el) el = (event && event.target && event.target.querySelectorAll) ? event.target : document;
    I18n.apply(el);
    wireCommon(el);
    var name = el.getAttribute ? el.getAttribute('data-name') : null;
    if (name === 'menu') { wireMenu(el); renderControlUI(); }
    else if (name === 'settings') wireSettings(el);
    else if (name === 'help') wireHelp(el);
  }

  // A small handle for the browser console, and for tools/verify-ui.mjs.
  global.ChessClockApp = {
    app: function () { return app; },
    clock: function () { return clock; },
    control: function () { return control; },
    settings: function () { return settings; },
    refresh: refreshDynamicText
  };

  I18n.init();
  Themes.init();
  Sound.enabled = settings.sound;
  Haptics.enabled = settings.vibrate;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
