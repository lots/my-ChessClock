/*!
 * i18n.js - Bilingual dictionary (EN / 简体中文) + tiny translation engine.
 * Plain global script (no ES modules) so the app also runs from file:// on a PC.
 */
(function (global) {
  'use strict';

  var DICT = {
    en: {
      'app.name': 'CoQ Weiqi/Chess Clock',
      'app.tagline': 'A tournament-ready virtual chess clock',
      'app.menu': 'Menu',
      'app.back': 'Back',

      'lang.title': 'Language',
      'lang.hint': 'Switch the interface language',

      'theme.title': 'Colour theme',
      'theme.classic': 'Classic',
      'theme.midnight': 'Midnight',
      'theme.contrast': 'High Contrast',

      'mode.title': 'Timing mode',
      'mode.simple': 'Simple',
      'mode.increment': 'Increment',
      'mode.delay': 'Delay',
      'mode.simple.desc': 'Sudden death. Each player gets one fixed amount of time, with no bonus added.',
      'mode.increment.desc': 'Fischer bonus. Extra seconds are added to your clock every time you complete a move.',
      'mode.delay.desc': 'Bronstein delay. Every move gets a free head start; your main time only runs once the delay is used up.',
      'mode.byoyomi': 'Byo-yomi',
      'mode.byoyomi.desc': 'Japanese overtime, taken from Go. Once the main time is gone every move gets a fresh countdown; letting one run out costs a period rather than the game, until the periods are used up.',

      'time.title': 'Time control',
      'time.minutes': 'Main time (min)',
      'time.increment': 'Increment (sec)',
      'time.delay': 'Delay (sec)',
      'time.byoPeriod': 'Period (sec)',
      'time.byoPeriods': 'Periods',
      'time.custom': 'Custom',
      'time.summary': 'Clock',
      'time.moveLimit': 'Moves',

      'players.title': 'Players',
      'players.p1': 'Player 1',
      'players.p2': 'Player 2',
      'players.namePlaceholder': '---',
      'players.swap': 'Swap sides',
      'players.first': 'First to move',
      'side.black': 'Black',
      'side.white': 'White',
      'players.rotate': 'Rotate display',

      'start': 'START',
      'start.hint': 'The first mover\u2019s clock starts as soon as you press START, so place the device first.',

      'settings.title': 'Settings',
      'settings.display': 'Display',
      'settings.sound': 'Sound',
      'settings.vibrate': 'Vibration',
      'settings.wake': 'Keep screen awake',
      'settings.fullscreen': 'Fullscreen on start',
      'settings.faceToFace': 'Face-to-face rotation',
      'settings.faceToFace.hint': 'Turns the second display upside down, so two players sitting opposite each other can both read their own clock.',
      'settings.dim': 'Dim inactive clock',
      'settings.warnSound': 'Low-time warning beeps',
      'settings.testSound': 'Test sound',
      'settings.reset': 'Restore defaults',
      'settings.about': 'About & Help',
      'settings.data': 'Settings are stored on this device only.',

      'clock.pause': 'Pause',
      'clock.resume': 'Resume',
      'clock.reset': 'Reset',
      'clock.exit': 'Close',
      'clock.paused': 'PAUSED',
      'clock.pausedHint': 'Tap Resume to continue',
      'clock.readySide': 'Tap {side}\u2019s side to start',
      'clock.moves': 'moves',
      'clock.secShort': 's',
      'clock.flagged': 'TIME OUT',
      'clock.flagBody': '{loser} ran out of time. {winner} wins.',
      'clock.flagBodyByo': '{loser} ran out of byo-yomi periods. {winner} wins.',
      'clock.newGame': 'New game',
      'clock.close': 'Back to menu',
      // Shown for a seat the organiser has not named.
      'clock.noName': '---',
      'clock.title.pause': 'Pause \u2014 stops both clocks for an arbiter interruption',
      'clock.title.resume': 'Resume \u2014 the clock carries on from where it stopped',
      'clock.title.rotate': 'Turn the opponent\u2019s half 180\u00b0 for face-to-face play',
      'clock.title.reset': 'Reset \u2014 clear both clocks and start a new game',
      'clock.title.exit': 'Close the clock and go back to the menu',

      'dialog.reset.title': 'Reset the clock?',
      'dialog.reset.text': 'The current game and both times will be cleared.',
      'dialog.exit.title': 'Leave the clock?',
      'dialog.exit.text': 'The game in progress will be abandoned.',
      'dialog.ok': 'Confirm',
      'dialog.cancel': 'Cancel',

      'help.title': 'About & Help',
      'help.features.title': 'What a real chess clock does',
      'help.features.body': 'A tournament clock is two independent countdown timers that are interlocked: pressing your lever stops your own clock and starts your opponent\u2019s, so exactly one clock is ever running. It counts your moves, flags the moment a player reaches zero, and can be paused by the arbiter. Everything below is what this app reproduces, plus the four timing modes used in real events.',
      'help.byoyomi.title': 'About byo-yomi',
      'help.byoyomi.body': 'Byo-yomi comes from Japanese Go and is its overtime system. For \u201c30 min + 5 \u00d7 30 s\u201d: once the main time is gone, every move gets its own 30-second countdown. Move inside it and the countdown simply restarts for the next move, with all 5 periods still yours. Exceed it and you lose one period, receiving a fresh 30 seconds on the same move. Lose all 5 and you are out of time. Chess regulations do not use byo-yomi; it is here for organisers who also run Go, or who want a gentler overtime than sudden death.',

      'help.how.title': 'How to use it',
      'help.how.body': '1. On the menu, choose a language, a colour theme and a time control.\n2. Enter the players\u2019 names if you like, and choose who moves first \u2014 Black by default, White for chess.\n3. Press START: the first mover\u2019s clock begins running immediately, so place the device before you press it.\n4. Keep face-to-face rotation on, so each side reads its own half upright.\n5. The player on move taps their own half to hand the move over. Never tap your opponent\u2019s half.\n6. Use Pause for an arbiter interruption. Reset returns the clock to the tap-to-start state.',
      'help.tips.title': 'Tournament tips',
      'help.tips.body': '\u2022 Keep the screen awake: enable it in Settings, and bring a power bank for long events.\n\u2022 For beginners, 10+5 (increment) or 15+10 avoids frantic scrambles.\n\u2022 Agree the time control out loud and show both players the display before starting.\n\u2022 If a device fails mid-game, note both times and the move count, then restore them on a second device.\n\u2022 A phone clock is a convenient stand-in, not a certified timing device; for rated events always use an approved clock.',
      'help.install.title': 'Install / offline use',
      'help.install.body': 'Open the page in the browser, then use \u201cAdd to Home Screen\u201d. Once loaded, the app keeps working with no network at all.',
      'help.icons.title': 'Replacing the logo',
      'help.icons.body': 'The logo is a plain file. Replace icons/icon-48.png and icons/icon-96.png with your own artwork (same names, same sizes) and refresh \u2014 the browser icon, the home-screen icon and the in-app logo all change at once. No rebuild and no code edit needed.',
      'help.licence.body': 'Built with HTML5, CSS and JavaScript on the Framework7 framework. Works offline from a local file or from any static web host.'
    },

    zh: {
      'app.name': 'CoQ棋钟',
      'app.tagline': '可用于正式比赛的虚拟棋钟',
      'app.menu': '菜单',
      'app.back': '返回',

      'lang.title': '语言',
      'lang.hint': '切换界面语言',

      'theme.title': '配色主题',
      'theme.classic': '经典',
      'theme.midnight': '暗夜',
      'theme.contrast': '高对比',

      'mode.title': '计时模式',
      'mode.simple': '简单',
      'mode.increment': '加秒',
      'mode.delay': '延时',
      'mode.simple.desc': '包干制。每位选手只有一份固定的时间，不额外加秒。',
      'mode.increment.desc': '费舍尔加秒。每次走完一步，自己的棋钟立即增加规定的秒数。',
      'mode.delay.desc': '布朗斯坦延时。每一步先享用免时的延时，延时用完之后才开始消耗主时间。',
      'mode.byoyomi': '读秒',
      'mode.byoyomi.desc': '日本式读秒，源自围棋。主时间用完后，每一步都会重新获得一次完整读秒；读秒走完只损失一次机会，而不是直接判负，直到读秒次数全部用尽。',

      'time.title': '比赛时限',
      'time.minutes': '主时间（分钟）',
      'time.increment': '加秒（秒）',
      'time.delay': '延时（秒）',
      'time.byoPeriod': '读秒时长（秒）',
      'time.byoPeriods': '读秒次数',
      'time.custom': '自定义',
      'time.summary': '棋钟',
      'time.moveLimit': '步数',

      'players.title': '选手',
      'players.p1': '选手 1',
      'players.p2': '选手 2',
      'players.namePlaceholder': '---',
      'players.swap': '交换左右',
      'players.first': '先手方',
      'side.black': '黑方',
      'side.white': '白方',
      'players.rotate': '旋转显示',

      'start': '开始',
      'start.hint': '按「开始」后先手方立即开始计时，请先把设备放好。',

      'settings.title': '设置',
      'settings.display': '显示',
      'settings.sound': '声音',
      'settings.vibrate': '震动',
      'settings.wake': '保持屏幕常亮',
      'settings.fullscreen': '开始时进入全屏',
      'settings.faceToFace': '面对面旋转',
      'settings.faceToFace.hint': '把另一方的显示旋转 180 度，两人隔桌对坐时都能正着看自己的棋钟。',
      'settings.dim': '非活动方变暗',
      'settings.warnSound': '读秒提示音',
      'settings.testSound': '测试声音',
      'settings.reset': '恢复默认设置',
      'settings.about': '关于与帮助',
      'settings.data': '设置仅保存在本机浏览器中。',

      'clock.pause': '暂停',
      'clock.resume': '继续',
      'clock.reset': '重置',
      'clock.exit': '关闭',
      'clock.paused': '已暂停',
      'clock.pausedHint': '点击“继续”恢复计时',
      'clock.readySide': '点按{side}一侧开始',
      'clock.moves': '步',
      'clock.secShort': '秒',
      'clock.flagged': '超时',
      'clock.flagBody': '{loser} 超时，{winner} 获胜。',
      'clock.flagBodyByo': '{loser} 读秒次数用尽，{winner} 获胜。',
      'clock.newGame': '新对局',
      'clock.close': '返回菜单',
      // Shown for a seat the organiser has not named.
      'clock.noName': '---',
      'clock.title.pause': '暂停 — 裁判中断时停止双方计时',
      'clock.title.resume': '继续 — 从暂停处接着计时',
      'clock.title.rotate': '把对方那一半旋转 180°，便于隔桌对坐',
      'clock.title.reset': '重置 — 清零双方用时并开始新的一局',
      'clock.title.exit': '关闭棋钟并返回菜单',

      'dialog.reset.title': '重置棋钟？',
      'dialog.reset.text': '当前对局与双方用时都会被清除。',
      'dialog.exit.title': '离开棋钟？',
      'dialog.exit.text': '正在进行的对局将被放弃。',
      'dialog.ok': '确定',
      'dialog.cancel': '取消',

      'help.title': '关于与帮助',
      'help.features.title': '实体棋钟是怎么工作的',
      'help.features.body': '比赛棋钟是两只相互联锁的倒计时器：按下自己这一侧的按钮，自己的钟停止、对手的钟启动，因此任何时刻都只有一只钟在走。它还会记录步数、在某一方归零的瞬间亮旗，并允许裁判暂停。本应用完整复现了这些功能，并提供正式比赛中常用的四种计时模式。',
      'help.byoyomi.title': '关于读秒（Byo-yomi）',
      'help.byoyomi.body': '读秒源自日本围棋，是主时间用尽后的加时制度。以“30 分钟 + 5 次 30 秒”为例：主时间归零后，每一步都会重新获得 30 秒的独立倒计时；在 30 秒内落子，倒计时重新计满，5 次机会分文不少；超过 30 秒则损失一次机会，并立即重新获得 30 秒继续走完这一步；5 次机会全部用尽仍未落子，即判超时。国际象棋正式规则并不使用读秒，这里提供给同时开展围棋活动的组织者，或希望加时比“突然死亡”更温和的场合。',

      'help.how.title': '使用步骤',
      'help.how.body': '1. 在菜单页选择语言、配色主题与比赛时限。\n2. 如有需要填写选手姓名，并选择先手方 —— 默认黑先，国际象棋可选白先。\n3. 按“开始”后先手方棋钟立即开始计时，请先把设备放好再按。\n4. 保持“面对面旋转”开启，两人隔桌对坐时都能正着看自己那一半。\n5. 轮到哪一方走棋，就由该方点按自己那一半完成交接；切勿点按对方的区域。\n6. 裁判处理争议时可使用“暂停”；“重置”会回到“点按开始”状态。',
      'help.tips.title': '办赛提示',
      'help.tips.body': '\u2022 请在设置中开启“保持屏幕常亮”，长时间比赛建议配一个移动电源。\n\u2022 面向初学者，建议使用 10+5（加秒）或 15+10，避免最后阶段手忙脚乱。\n\u2022 开局前口头确认时限，并让双方都看清显示。\n\u2022 若设备中途故障，请记录双方剩余时间与步数，换一台设备接着用。\n\u2022 手机棋钟只是临时替代方案，并非认证计时设备；正式等级赛请使用经认可的棋钟。',
      'help.install.title': '安装与离线使用',
      'help.install.body': '用浏览器打开本页面后，选择“添加到主屏幕”。首次加载完成后，即使完全没有网络也能照常使用。',
      'help.icons.title': '更换标志',
      'help.icons.body': '标志就是两个普通图片文件。用你自己的图案覆盖 icons/icon-48.png 与 icons/icon-96.png（文件名与尺寸保持不变）后刷新即可：浏览器标签图标、主屏幕图标与应用内标志会同时更新，无需重新构建，也无需修改任何代码。',
      'help.licence.body': '使用 HTML5、CSS 与 JavaScript 编写，界面基于 Framework7 框架。既可从本机文件离线运行，也可部署到任意静态网站空间。'
    }
  };

  var STORE_KEY = 'cc.lang';
  var current = 'en';
  var listeners = [];

  function normalise(lang) {
    if (!lang) return 'en';
    var l = String(lang).toLowerCase();
    if (l.indexOf('zh') === 0 || l.indexOf('cn') === 0 || l === 'hans' || l.indexOf('chinese') === 0) return 'zh';
    return 'en';
  }

  function detect() {
    try {
      var saved = global.localStorage && global.localStorage.getItem(STORE_KEY);
      if (saved && DICT[saved]) return saved;
    } catch (e) { /* storage may be blocked */ }
    var list = (global.navigator && (global.navigator.languages || [global.navigator.language])) || [];
    if (typeof list === 'string') list = [list];
    for (var i = 0; i < list.length; i++) {
      if (/^(zh|cn)/i.test(list[i])) return 'zh';
    }
    return 'en';
  }

  function interpolate(str, vars) {
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, function (m, key) {
      return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : m;
    });
  }

  var I18n = {
    available: ['en', 'zh'],

    get lang() { return current; },

    t: function (key, vars) {
      var table = DICT[current] || DICT.en;
      var value = table[key];
      if (value === undefined) value = DICT.en[key];
      if (value === undefined) return key;
      return interpolate(value, vars);
    },

    /** Human label of a language, shown in its own script. */
    label: function (code) {
      return code === 'zh' ? '\u534e\u6587' : 'EN';
    },

    set: function (lang, opts) {
      var next = normalise(lang);
      if (!DICT[next]) next = 'en';
      current = next;
      try { global.localStorage && global.localStorage.setItem(STORE_KEY, next); } catch (e) { /* ignore */ }
      if (!opts || opts.apply !== false) I18n.apply();
      document.documentElement.setAttribute('lang', next === 'zh' ? 'zh-Hans' : 'en');
      for (var i = 0; i < listeners.length; i++) {
        try { listeners[i](next); } catch (e) { /* keep other listeners alive */ }
      }
      return current;
    },

    toggle: function () { return I18n.set(current === 'en' ? 'zh' : 'en'); },

    onChange: function (fn) { listeners.push(fn); },

    /**
     * Rewrites every tagged node in the document:
     *   data-i18n       -> textContent
     *   data-i18n-html  -> innerHTML (used for multi-line help text)
     *   data-i18n-ph    -> placeholder
     *   data-i18n-title -> title + aria-label
     */
    apply: function (scope) {
      var host = scope || document;
      var each = function (selector, attr, write) {
        var nodes = host.querySelectorAll('[' + attr + ']');
        for (var i = 0; i < nodes.length; i++) {
          var key = nodes[i].getAttribute(attr);
          if (key) write(nodes[i], I18n.t(key));
        }
      };
      each('data-i18n', 'data-i18n', function (el, text) { el.textContent = text; });
      each('data-i18n-html', 'data-i18n-html', function (el, text) {
        el.innerHTML = text.split('\n').map(function (line) {
          return '<p class="help-line">' + escapeHtml(line) + '</p>';
        }).join('');
      });
      each('data-i18n-ph', 'data-i18n-ph', function (el, text) { el.setAttribute('placeholder', text); });
      each('data-i18n-title', 'data-i18n-title', function (el, text) {
        el.setAttribute('title', text);
        el.setAttribute('aria-label', text);
      });
    },

    init: function () { return I18n.set(detect(), { apply: false }); }
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  global.I18n = I18n;
})(window);
