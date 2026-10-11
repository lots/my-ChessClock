/*!
 * views.js - Markup for every screen. Plain HTML strings so the same files work
 * from file://, from a static host, and from inside the Framework7 router.
 */
(function (global) {
  'use strict';

  /* Inline SVG icon set - keeps the app free of icon fonts and extra requests. */
  var ICONS = {
    palette: '<path d="M12 3a9 9 0 1 0 0 18h1.4a1.9 1.9 0 0 0 1.5-3.1 1.9 1.9 0 0 1 1.5-3.1H19a2 2 0 0 0 2-2A9 9 0 0 0 12 3z"/><circle cx="7.6" cy="12.2" r="1.1"/><circle cx="10" cy="7.9" r="1.1"/><circle cx="14.6" cy="7.9" r="1.1"/>',
    pause: '<rect x="7" y="5" width="3.6" height="14" rx="1.2"/><rect x="13.4" y="5" width="3.6" height="14" rx="1.2"/>',
    play: '<path d="M8 5.6v12.8a1 1 0 0 0 1.5.85l10-6.4a1 1 0 0 0 0-1.7l-10-6.4A1 1 0 0 0 8 5.6z"/>',
    rotate: '<path d="M20 11a8 8 0 1 0-2.3 6.4"/><path d="M20 4.5V11h-6.3"/>',
    reset: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.2 4.8v5.4h5.4"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    chevron: '<path d="M9 5l7 7-7 7"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 14.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.11a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.11a1.7 1.7 0 0 0 1.55-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.11a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.11a1.7 1.7 0 0 0-1.49 1z"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.4 9.2a2.7 2.7 0 0 1 5.2.9c0 1.8-2.6 2.7-2.6 2.7"/><circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none"/>',
    swap: '<path d="M7 8h13l-3.2-3.2M17 16H4l3.2 3.2"/>',
    sound: '<path d="M11 5.5 6.8 9H3.5v6h3.3L11 18.5z"/><path d="M15 9.2a4 4 0 0 1 0 5.6"/><path d="M17.8 6.6a8 8 0 0 1 0 10.8"/>',
    flag: '<path d="M5 21V4M5 4.8c4-2.2 7 2.2 13-.4V15c-6 2.6-9-1.8-13 .4"/>',
  };

  function icon(name, cls) {
    return '<svg class="cc-ico ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      (ICONS[name] || '') + '</svg>';
  }

  function head(titleKey, noteKey, right) {
    return '<div class="cc-card-head">' +
      '<span class="cc-card-title" data-i18n="' + titleKey + '"></span>' +
      (noteKey ? '<span class="cc-card-note" data-i18n="' + noteKey + '"></span>' : '') +
      (right || '') + '</div>';
  }

  function settingRow(key, hintKey, setting) {
    return '<div class="cc-row">' +
      '<div class="cc-row-text">' +
        '<div class="cc-row-title" data-i18n="' + key + '"></div>' +
        (hintKey ? '<div class="cc-row-hint" data-i18n="' + hintKey + '"></div>' : '') +
      '</div>' +
      '<label class="toggle"><input type="checkbox" data-setting="' + setting + '"><span class="toggle-icon"></span></label>' +
    '</div>';
  }

  function logo(size) {
    return '<img class="cc-logo" width="' + size + '" height="' + size + '" alt="" ' +
      'src="icons/icon-' + size + '.png" ' +
      'srcset="icons/icon-48.png 1x, icons/icon-96.png 2x">';
  }

  /* ------------------------------------------------------------- menu page */

  function menu() {
    var themed = global.Themes.order.map(function (id) {
      return '<button type="button" class="cc-theme" data-theme-id="' + id + '">' +
        '<span class="cc-swatch" data-swatch="' + id + '"></span>' +
        '<span class="cc-theme-name" data-i18n="theme.' + id + '"></span>' +
      '</button>';
    }).join('');

    return '' +
    '<div class="page" data-name="menu">' +
      '<div class="navbar">' +
        '<div class="navbar-bg"></div>' +
        '<div class="navbar-inner">' +
          '<div class="left"></div>' +
          '<div class="title" data-i18n="app.name"></div>' +
          '<div class="right"><a href="#" class="link cc-icon-btn" data-act="cycle-theme" data-i18n-title="theme.title">' + icon('palette') + '</a></div>' +
        '</div>' +
      '</div>' +
      '<div class="page-content cc-menu">' +

        '<div class="cc-hero">' + logo(48) +
          '<div class="cc-hero-text">' +
            '<h1 class="cc-hero-title" data-i18n="app.name"></h1>' +
            '<p class="cc-hero-sub" data-i18n="app.tagline"></p>' +
          '</div>' +
        '</div>' +

        '<div class="card cc-card"><div class="card-content card-content-padding">' +
          head('lang.title', 'lang.hint') +
          '<div class="segmented cc-seg" data-seg="lang">' +
            '<button type="button" class="button" data-lang="en">EN</button>' +
            '<button type="button" class="button" data-lang="zh">\u534e\u6587</button>' +
          '</div>' +
        '</div></div>' +

        '<div class="card cc-card"><div class="card-content card-content-padding">' +
          head('theme.title') +
          '<div class="cc-themes" data-seg="theme">' + themed + '</div>' +
        '</div></div>' +

        '<div class="card cc-card"><div class="card-content card-content-padding">' +
          head('mode.title') +
          '<div class="segmented cc-seg" data-seg="mode">' +
            '<button type="button" class="button" data-mode="simple" data-i18n="mode.simple"></button>' +
            '<button type="button" class="button" data-mode="increment" data-i18n="mode.increment"></button>' +
            '<button type="button" class="button" data-mode="delay" data-i18n="mode.delay"></button>' +
            '<button type="button" class="button" data-mode="byoyomi" data-i18n="mode.byoyomi"></button>' +
          '</div>' +
          '<p class="cc-desc" id="cc-mode-desc"></p>' +
        '</div></div>' +

        '<div class="card cc-card"><div class="card-content card-content-padding">' +
          head('time.title', null, '<span class="cc-badge" id="cc-summary"></span>') +
          '<div class="cc-presets" id="cc-presets"></div>' +
          '<div class="cc-fields">' +
            '<div class="cc-field" data-field="minutes">' +
              '<label class="cc-label" for="cc-minutes" data-i18n="time.minutes"></label>' +
              '<div class="cc-stepper">' +
                '<button type="button" class="cc-stepper-btn" data-stepper="minutes" data-delta="-1" aria-label="-">\u2212</button>' +
                '<input class="cc-input" id="cc-minutes" type="number" inputmode="numeric" min="1" max="180" step="1" value="5">' +
                '<button type="button" class="cc-stepper-btn" data-stepper="minutes" data-delta="1" aria-label="+">+</button>' +
              '</div>' +
            '</div>' +
            '<div class="cc-field" data-field="bonus">' +
              '<label class="cc-label" id="cc-bonus-label" for="cc-bonus" data-i18n="time.increment"></label>' +
              '<div class="cc-stepper">' +
                '<button type="button" class="cc-stepper-btn" data-stepper="bonus" data-delta="-1" aria-label="-">\u2212</button>' +
                '<input class="cc-input" id="cc-bonus" type="number" inputmode="numeric" min="0" max="600" step="1" value="0">' +
                '<button type="button" class="cc-stepper-btn" data-stepper="bonus" data-delta="1" aria-label="+">+</button>' +
              '</div>' +
            '</div>' +
            '<div class="cc-field is-hidden" data-field="periods">' +
              '<label class="cc-label" for="cc-periods" data-i18n="time.byoPeriods"></label>' +
              '<div class="cc-stepper">' +
                '<button type="button" class="cc-stepper-btn" data-stepper="periods" data-delta="-1" aria-label="-">\u2212</button>' +
                '<input class="cc-input" id="cc-periods" type="number" inputmode="numeric" min="1" max="99" step="1" value="5">' +
                '<button type="button" class="cc-stepper-btn" data-stepper="periods" data-delta="1" aria-label="+">+</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div></div>' +

        '<div class="card cc-card"><div class="card-content card-content-padding">' +
          head('players.title') +
          '<div class="cc-players">' +
            '<div class="cc-field">' +
              '<label class="cc-label" for="cc-name0" data-i18n="players.p1"></label>' +
              '<input class="cc-input cc-input-text" id="cc-name0" type="text" maxlength="24" autocomplete="off" data-i18n-ph="players.namePlaceholder">' +
            '</div>' +
            '<button type="button" class="cc-swap" id="cc-swap" data-i18n-title="players.swap">' + icon('swap') + '</button>' +
            '<div class="cc-field">' +
              '<label class="cc-label" for="cc-name1" data-i18n="players.p2"></label>' +
              '<input class="cc-input cc-input-text" id="cc-name1" type="text" maxlength="24" autocomplete="off" data-i18n-ph="players.namePlaceholder">' +
            '</div>' +
          '</div>' +
          '<div class="cc-first">' +
            '<span class="cc-label" data-i18n="players.first"></span>' +
            '<div class="segmented cc-seg" data-seg="first">' +
              '<button type="button" class="button" data-first="black" data-i18n="side.black"></button>' +
              '<button type="button" class="button" data-first="white" data-i18n="side.white"></button>' +
            '</div>' +
          '</div>' +
        '</div></div>' +

        '<button type="button" class="button button-fill cc-start" id="cc-start">' +
          icon('play') + '<span data-i18n="start"></span></button>' +
        '<p class="cc-hint" data-i18n="start.hint"></p>' +

        '<div class="cc-nav-rows">' +
          '<a href="/settings/" class="cc-nav-row" data-nav="/settings/">' + icon('gear') +
            '<span class="cc-nav-row-text" data-i18n="settings.title"></span>' + icon('chevron', 'cc-nav-row-caret') + '</a>' +
          '<a href="/help/" class="cc-nav-row" data-nav="/help/">' + icon('help') +
            '<span class="cc-nav-row-text" data-i18n="help.title"></span>' + icon('chevron', 'cc-nav-row-caret') + '</a>' +
        '</div>' +
        '<p class="cc-foot" data-i18n="settings.data"></p>' +
      '</div>' +
    '</div>';
  }

  /* --------------------------------------------------------- settings page */

  function settings() {
    return '' +
    '<div class="page" data-name="settings">' +
      '<div class="navbar">' +
        '<div class="navbar-bg"></div>' +
        '<div class="navbar-inner">' +
          '<div class="left"><a href="#" class="link cc-icon-btn cc-back" data-act="back">' + icon('back') +
            '<span data-i18n="app.back"></span></a></div>' +
          '<div class="title" data-i18n="settings.title"></div>' +
          '<div class="right"></div>' +
        '</div>' +
      '</div>' +
      '<div class="page-content">' +
        '<div class="card cc-card"><div class="card-content card-content-padding">' +
          head('settings.display') +
          '<div class="cc-rows">' +
            settingRow('settings.sound', null, 'sound') +
            settingRow('settings.vibrate', null, 'vibrate') +
            settingRow('settings.warnSound', null, 'warnBeeps') +
            '<div class="cc-rows-sep"></div>' +
            settingRow('settings.wake', null, 'wake') +
            settingRow('settings.fullscreen', null, 'fullscreen') +
            '<div class="cc-rows-sep"></div>' +
            settingRow('settings.faceToFace', 'settings.faceToFace.hint', 'faceToFace') +
            settingRow('settings.dim', null, 'dim') +
          '</div>' +
        '</div></div>' +
        '<div class="cc-actions">' +
          '<button type="button" class="button cc-btn" id="set-test">' + icon('sound') +
            '<span data-i18n="settings.testSound"></span></button>' +
          '<button type="button" class="button cc-btn" id="set-defaults">' + icon('reset') +
            '<span data-i18n="settings.reset"></span></button>' +
        '</div>' +
        '<p class="cc-foot" data-i18n="settings.data"></p>' +
        '<div class="cc-version"><span data-i18n="app.name"></span> \u00b7 v1.0.0</div>' +
      '</div>' +
    '</div>';
  }

  /* ------------------------------------------------------------- help page */

  function help() {
    return '' +
    '<div class="page" data-name="help">' +
      '<div class="navbar">' +
        '<div class="navbar-bg"></div>' +
        '<div class="navbar-inner">' +
          '<div class="left"><a href="#" class="link cc-icon-btn cc-back" data-act="back">' + icon('back') +
            '<span data-i18n="app.back"></span></a></div>' +
          '<div class="title" data-i18n="help.title"></div>' +
          '<div class="right"></div>' +
        '</div>' +
      '</div>' +
      '<div class="page-content">' +
        '<div class="card cc-card"><div class="card-content card-content-padding cc-about-brand">' +
          logo(48) +
          '<div><div class="cc-about-name" data-i18n="app.name"></div>' +
          '<div class="cc-about-sub" data-i18n="app.tagline"></div></div>' +
        '</div></div>' +
        helpCard('help.features.title', 'help.features.body') +
        helpCard('help.byoyomi.title', 'help.byoyomi.body') +
        helpCard('help.how.title', 'help.how.body') +
        helpCard('help.tips.title', 'help.tips.body') +
        helpCard('help.install.title', 'help.install.body') +
        '<div class="card cc-card"><div class="card-content card-content-padding">' +
          head('help.icons.title') +
          '<p class="help-line" data-i18n="help.icons.body"></p>' +
          '<div class="cc-icon-files">' +
            '<figure class="cc-icon-file"><img src="icons/icon-48.png" width="48" height="48" alt="icon-48.png">' +
              '<figcaption>icons/icon-48.png<small>48 \u00d7 48</small></figcaption></figure>' +
            '<figure class="cc-icon-file"><img src="icons/icon-96.png" width="96" height="96" alt="icon-96.png">' +
              '<figcaption>icons/icon-96.png<small>96 \u00d7 96</small></figcaption></figure>' +
          '</div>' +
        '</div></div>' +
        '<p class="cc-foot" data-i18n="help.licence.body"></p>' +
      '</div>' +
    '</div>';
  }

  function helpCard(titleKey, bodyKey) {
    return '<div class="card cc-card"><div class="card-content card-content-padding">' +
      head(titleKey) + '<div class="cc-help" data-i18n-html="' + bodyKey + '"></div>' +
      '</div></div>';
  }

  /* ------------------------------------------------------------ clock page */

  function side(index) {
    return '<section class="cc-side" data-side="' + index + '">' +
      '<div class="cc-side-inner">' +
        '<div class="cc-side-top"><span class="cc-colour"></span>' +
          '<span class="cc-name"></span>' +
          '<span class="cc-side-state">' + icon('play', 'cc-state-play') + '</span></div>' +
        '<div class="cc-time-wrap"><span class="cc-time">00:00</span></div>' +
        '<div class="cc-side-bottom"><span class="cc-moves"><b class="cc-move-count">0</b> ' +
          '<span class="cc-moves-word" data-i18n="clock.moves"></span></span>' +
          '<span class="cc-byo" hidden></span>' +
          '<span class="cc-side-hint"></span></div>' +
      '</div>' +
    '</section>';
  }

  function clock() {
    return '' +
    // popup-tablet-fullscreen opts out of Framework7's 630x630 "tablet card"
    // treatment, which otherwise centres the clock with negative margins.
    '<div class="popup cc-clock popup-tablet-fullscreen" id="cc-clock">' +
      '<div class="cc-stage" id="cc-stage" data-rot="on" data-status="ready">' +
        side(0) +
        '<div class="cc-mid">' +
          '<div class="cc-mid-group">' +
            '<button type="button" class="cc-mid-btn" data-act="pause" data-i18n-title="clock.title.pause"></button>' +
            '<button type="button" class="cc-mid-btn" data-act="flip" data-i18n-title="clock.title.rotate">' + icon('rotate') + '</button>' +
          '</div>' +
          '<span class="cc-mid-logo">' + logo(48) + '</span>' +
          '<div class="cc-mid-group">' +
            '<button type="button" class="cc-mid-btn" data-act="reset" data-i18n-title="clock.title.reset">' + icon('reset') + '</button>' +
            '<button type="button" class="cc-mid-btn cc-mid-exit" data-act="exit" data-i18n-title="clock.title.exit">' + icon('close') + '</button>' +
          '</div>' +
        '</div>' +
        side(1) +
        '<div class="cc-center" id="cc-center" hidden><span class="cc-center-pill" id="cc-center-pill"></span></div>' +
        '<div class="cc-flag" id="cc-flag" hidden>' +
          '<div class="cc-flag-box">' +
            '<div class="cc-flag-icon">' + icon('flag') + '</div>' +
            '<div class="cc-flag-title" data-i18n="clock.flagged"></div>' +
            '<div class="cc-flag-body" id="cc-flag-body"></div>' +
            '<div class="cc-flag-times" id="cc-flag-times"></div>' +
            '<div class="cc-flag-actions">' +
              '<button type="button" class="button button-fill cc-btn" id="cc-newgame" data-i18n="clock.newGame"></button>' +
              '<button type="button" class="button cc-btn" id="cc-backmenu" data-i18n="clock.close"></button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  global.Views = { menu: menu, settings: settings, help: help, clock: clock, icon: icon, ICONS: ICONS };
})(window);
