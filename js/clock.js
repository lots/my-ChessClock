/*!
 * clock.js - The chess clock engine.
 *
 * Two interlocked countdown timers. Exactly one of them is ever running, and the
 * player on move hands the turn over by tapping their own half of the display.
 *
 * Four timing modes:
 *   simple     sudden death, one pool of time
 *   increment  Fischer bonus, +N seconds credited after every move
 *   delay      Bronstein delay, the first N seconds of a move are free
 *   byoyomi    Japanese overtime: a main time, then N periods of X seconds each.
 *              In overtime the display counts the current period down; using up
 *              a period costs a "life" rather than the game, and the period
 *              restarts in full on every move that is completed in time.
 *
 * Timing is derived from monotonic timestamps (performance.now()) instead of
 * accumulated setInterval ticks. That matters on a phone: requestAnimationFrame
 * is throttled to zero while the screen is off or the tab is in the background,
 * but the elapsed wall time is still measured correctly the moment we wake up,
 * so a clock can never silently "gain" time.
 */
(function (global) {
  'use strict';

  var MODES = ['simple', 'increment', 'delay', 'byoyomi'];

  function clamp(n, lo, hi) { return n < lo ? lo : (n > hi ? hi : n); }

  function pad(n, width) {
    var s = String(Math.floor(Math.abs(n)));
    while (s.length < width) s = '0' + s;
    return s;
  }

  /**
   * Format a duration the way a tournament clock does.
   *   >= 1 hour  ->  H:MM:SS
   *   >= 20 sec  ->  MM:SS
   *   <  20 sec  ->  SS.t   (tenths, because this is where games are decided)
   */
  function format(ms) {
    if (ms < 0) ms = 0;
    if (ms >= 3600000) {
      var h = Math.floor(ms / 3600000);
      var m = Math.floor((ms % 3600000) / 60000);
      var s = Math.floor((ms % 60000) / 1000);
      return h + ':' + pad(m, 2) + ':' + pad(s, 2);
    }
    if (ms >= 20000) {
      var mm = Math.floor(ms / 60000);
      var ss = Math.floor((ms % 60000) / 1000);
      return pad(mm, 2) + ':' + pad(ss, 2);
    }
    var whole = Math.floor(ms / 1000);
    var tenth = Math.floor((ms % 1000) / 100);
    return pad(whole, 2) + '.' + tenth;
  }

  /** A compact badge for the menu: 5+3, 10+5d, or 30+5x30s for byo-yomi. */
  function describe(config) {
    var minutes = config.baseMs / 60000;
    var head = minutes % 1 === 0 ? String(minutes) : minutes.toFixed(1);
    var seconds = Math.round(config.bonusMs / 1000);
    if (config.mode === 'byoyomi') {
      return head + '+' + (config.periods || 0) + '\u00d7' + seconds + 's';
    }
    return head + '+' + seconds + (config.mode === 'delay' ? 'd' : '');
  }

  function createClock() {
    var config = {
      baseMs: 5 * 60000,
      bonusMs: 0,        // increment, delay, or the byo-yomi period length
      periods: 5,        // byo-yomi periods per player
      mode: 'simple',
      names: ['Player 1', 'Player 2']
    };

    var state = {
      status: 'ready',   // ready | running | paused | flagged
      times: [config.baseMs, config.baseMs],       // committed main time
      periods: [config.periods, config.periods],   // committed byo-yomi periods left
      moves: [0, 0],
      active: null,
      flagged: null,
      turnStart: null,
      turnMain: 0,       // main time the player on move had when the turn began
      turnPeriods: 0,    // byo-yomi periods they had when the turn began
      turnOffset: 0,     // time already burned on this turn before it was paused
      suspended: null    // what the paused player's display was showing
    };

    var listeners = { update: [], flag: [], state: [], lowtime: [], period: [], byostart: [] };
    var rafId = null;
    var intervalId = null;
    var lastBeep = { second: -1, period: -1 };

    function now() {
      return (global.performance && global.performance.now) ? global.performance.now() : Date.now();
    }

    function emit(name, payload) {
      var list = listeners[name] || [];
      for (var i = 0; i < list.length; i++) {
        try { list[i](payload); } catch (e) { /* a bad listener must not stop the clock */ }
      }
    }

    function periodMs() { return Math.max(1000, config.bonusMs); }

    function isByoyomi() { return config.mode === 'byoyomi'; }

    /** Milliseconds already spent on the current turn. */
    function turnElapsed() {
      if (state.status !== 'running' || state.turnStart === null) return state.turnOffset;
      var elapsed = state.turnOffset + (now() - state.turnStart);
      return elapsed < 0 ? 0 : elapsed;
    }

    /**
     * Everything about the player on move at this instant: their remaining main
     * time, whether they are in byo-yomi, which period they are in, and how much
     * of that period is left.
     */
    function liveTurn() {
      var elapsed = turnElapsed();

      if (isByoyomi()) {
        var length = periodMs();
        if (elapsed < state.turnMain) {
          return {
            ms: state.turnMain - elapsed, inByo: false, periodIndex: 0,
            periodsLeft: state.turnPeriods, periodMs: length, elapsed: elapsed
          };
        }
        var overtime = elapsed - state.turnMain;
        var index = Math.floor(overtime / length);
        return {
          ms: length - (overtime % length),
          inByo: true,
          periodIndex: index,
          periodsLeft: state.turnPeriods - index,
          periodMs: length,
          elapsed: elapsed
        };
      }

      var consumed = elapsed;
      // Bronstein delay: the first N seconds of every turn are free; the main
      // clock only starts moving once that head start is exhausted.
      if (config.mode === 'delay' && config.bonusMs > 0) consumed = Math.max(0, elapsed - config.bonusMs);
      return {
        ms: state.turnMain - consumed, inByo: false, periodIndex: 0,
        periodsLeft: state.turnPeriods, periodMs: periodMs(), elapsed: elapsed
      };
    }

    /** Has the player on move lost? */
    function isOut(live) {
      if (state.status !== 'running') return false;
      if (isByoyomi()) return live.inByo && live.periodsLeft <= 0;
      return live.ms <= 0;
    }

    function infoFor(side, live) {
      var length = periodMs();
      if (!isByoyomi()) {
        return {
          ms: live ? live.ms : state.times[side], inByo: false,
          periodsLeft: 0, periodMs: length, main: state.times[side]
        };
      }
      if (live) {
        return {
          ms: live.ms, inByo: live.inByo, periodIndex: live.periodIndex,
          periodsLeft: Math.max(0, live.periodsLeft), periodMs: live.periodMs, main: 0
        };
      }
      // Paused: show what was on screen at the moment of the interruption, so a
      // player in overtime still sees the period they are part-way through.
      if (state.suspended && state.suspended.side === side) return state.suspended;
      return {
        ms: state.times[side], inByo: state.times[side] <= 0, periodIndex: 0,
        periodsLeft: Math.max(0, state.periods[side]), periodMs: length, main: state.times[side]
      };
    }

    function snapshot() {
      var running = state.status === 'running' && state.active !== null;
      var live = running ? liveTurn() : null;
      var infos = [infoFor(0, state.active === 0 ? live : null), infoFor(1, state.active === 1 ? live : null)];
      var display = [infos[0].ms, infos[1].ms];
      if (state.status === 'flagged' && state.flagged !== null) display[state.flagged] = 0;
      return {
        status: state.status,
        active: state.active,
        flagged: state.flagged,
        times: display,
        main: [state.times[0], state.times[1]],
        live: infos,
        inByo: [infos[0].inByo, infos[1].inByo],
        moves: [state.moves[0], state.moves[1]],
        text: [format(display[0]), format(display[1])],
        lowTime: [
          display[0] <= 20000 && display[0] > 0,
          display[1] <= 20000 && display[1] > 0
        ],
        config: {
          baseMs: config.baseMs,
          bonusMs: config.bonusMs,
          periods: config.periods,
          mode: config.mode,
          names: [config.names[0], config.names[1]]
        }
      };
    }

    function notifyUpdate() { emit('update', snapshot()); }

    function setStatus(status) {
      state.status = status;
      emit('state', snapshot());
    }

    function beginTurn(side, offset) {
      state.active = side;
      state.turnStart = now();
      state.turnMain = state.times[side];
      state.turnPeriods = state.periods[side];
      state.turnOffset = offset || 0;
      state.suspended = null;
      lastBeep = { second: -1, period: -1 };
    }

    /** Freeze the running turn into committed time and periods. */
    function commitTurn(live) {
      if (state.status !== 'running' || state.active === null) return;
      var side = state.active;
      var turn = live || liveTurn();
      if (isByoyomi()) {
        state.times[side] = Math.max(0, state.turnMain - turn.elapsed);
        state.periods[side] = Math.max(0, turn.periodsLeft);
      } else {
        state.times[side] = Math.max(0, turn.ms);
      }
      state.turnStart = null;
    }

    function maybeWarn(live) {
      if (state.active === null) return;

      if (isByoyomi() && live.inByo && live.periodIndex !== lastBeep.period) {
        var firstOfTurn = lastBeep.period < 0;
        lastBeep.period = live.periodIndex;
        lastBeep.second = -1;
        if (firstOfTurn && state.turnMain > 0) {
          // Main time has just run out and the first period has begun.
          emit('byostart', { side: state.active, periodsLeft: Math.max(0, live.periodsLeft), periodMs: live.periodMs });
        } else if (!firstOfTurn) {
          // A whole period went by without a move: one "life" is gone.
          emit('period', { side: state.active, periodsLeft: Math.max(0, live.periodsLeft), periodMs: live.periodMs });
        }
      }

      var ms = live.ms;
      if (ms > 0 && ms <= 10000) {
        var seconds = Math.ceil(ms / 1000);
        if (seconds !== lastBeep.second) {
          lastBeep.second = seconds;
          emit('lowtime', { side: state.active, seconds: seconds, inByo: !!live.inByo });
        }
      }
    }

    function tick() {
      if (state.status !== 'running') return;
      var live = liveTurn();
      if (isOut(live)) { flag(state.active); return; }
      maybeWarn(live);
      notifyUpdate();
    }

    function flag(side) {
      cancelTurn();
      state.times[side] = 0;
      if (isByoyomi()) state.periods[side] = 0;
      state.flagged = side;
      state.active = side;
      setStatus('flagged');
      emit('flag', snapshot());
      notifyUpdate();
    }

    function startTicking() {
      stopTicking();
      var loop = function () {
        rafId = global.requestAnimationFrame(function () {
          tick();
          if (state.status === 'running') loop();
          else rafId = null;
        });
      };
      if (global.requestAnimationFrame) loop();
      // Belt and braces: rAF stops in a hidden tab, this keeps flag detection
      // and the moving digits alive at a coarse rate when possible.
      intervalId = global.setInterval(tick, 100);
    }

    function stopTicking() {
      if (rafId !== null && global.cancelAnimationFrame) global.cancelAnimationFrame(rafId);
      rafId = null;
      if (intervalId !== null) global.clearInterval(intervalId);
      intervalId = null;
    }

    function cancelTurn() {
      state.turnStart = null;
      state.turnOffset = 0;
      stopTicking();
    }

    var api = {
      MODES: MODES,
      format: format,
      describe: describe,

      get config() { return config; },
      get status() { return state.status; },
      get active() { return state.active; },
      isRunning: function () { return state.status === 'running'; },

      on: function (name, fn) {
        if (!listeners[name]) listeners[name] = [];
        listeners[name].push(fn);
        return api;
      },

      configure: function (next) {
        // Changing the time control under the players would be a rules breach,
        // so this is refused while a game is live. Reset first.
        if (state.status === 'running' || state.status === 'paused') return false;
        if (next.mode && MODES.indexOf(next.mode) >= 0) config.mode = next.mode;
        if (typeof next.baseMs === 'number' && isFinite(next.baseMs)) {
          config.baseMs = clamp(Math.round(next.baseMs), 1000, 24 * 3600000);
        }
        if (typeof next.bonusMs === 'number' && isFinite(next.bonusMs)) {
          config.bonusMs = clamp(Math.round(next.bonusMs), 0, 600000);
        }
        if (typeof next.periods === 'number' && isFinite(next.periods)) {
          config.periods = clamp(Math.round(next.periods), 1, 99);
        }
        if (Array.isArray(next.names)) {
          // Only fall back when the entry is absent: an empty string is a
          // legitimate value meaning "this seat has no name yet".
          var n0 = next.names[0] === undefined || next.names[0] === null ? config.names[0] : next.names[0];
          var n1 = next.names[1] === undefined || next.names[1] === null ? config.names[1] : next.names[1];
          config.names[0] = String(n0).slice(0, 24);
          config.names[1] = String(n1).slice(0, 24);
        }
        api.reset();
        return true;
      },

      reset: function () {
        cancelTurn();
        state.times = [config.baseMs, config.baseMs];
        state.periods = [config.periods, config.periods];
        state.moves = [0, 0];
        state.active = null;
        state.flagged = null;
        state.suspended = null;
        lastBeep = { second: -1, period: -1 };
        setStatus('ready');
        notifyUpdate();
      },

      /**
       * Ready  : the tapped player's clock starts running (they are on move).
       * Running: only the player on move may press; the move is committed, any
       *          Fischer increment is credited, and the opponent takes over.
       */
      press: function (side) {
        if (side !== 0 && side !== 1) return false;
        if (state.status === 'flagged' || state.status === 'paused') return false;

        if (state.status === 'ready') {
          beginTurn(side, 0);
          setStatus('running');
          startTicking();
          notifyUpdate();
          return true;
        }

        if (state.status === 'running') {
          if (state.active !== side) return false;   // ignore taps on the idle half
          var live = liveTurn();
          if (isOut(live)) { flag(side); return false; }
          commitTurn(live);
          state.moves[side] += 1;
          if (config.mode === 'increment' && config.bonusMs > 0) {
            // Fischer: the bonus lands after the move has been made.
            state.times[side] = state.times[side] + config.bonusMs;
          }
          beginTurn(side === 0 ? 1 : 0, 0);
          startTicking();
          notifyUpdate();
          return true;
        }

        return false;
      },

      pause: function () {
        if (state.status !== 'running') return false;
        var live = liveTurn();
        // Remember what is left of this turn, so resuming neither hands out a
        // fresh Bronstein delay nor a fresh byo-yomi period.
        var offset = 0;
        if (config.mode === 'delay' && config.bonusMs > 0) offset = Math.min(live.elapsed, config.bonusMs);
        else if (isByoyomi() && live.inByo) offset = periodMs() - live.ms;
        var side = state.active;
        commitTurn(live);
        state.turnOffset = offset;
        state.suspended = {
          side: side,
          ms: live.ms,
          inByo: live.inByo,
          periodIndex: live.periodIndex,
          periodsLeft: Math.max(0, live.periodsLeft),
          periodMs: live.periodMs,
          main: isByoyomi() ? Math.max(0, state.turnMain - live.elapsed) : state.times[side]
        };
        stopTicking();
        setStatus('paused');
        notifyUpdate();
        return true;
      },

      resume: function () {
        if (state.status !== 'paused' || state.active === null) return false;
        beginTurn(state.active, state.turnOffset);
        setStatus('running');
        startTicking();
        notifyUpdate();
        return true;
      },

      togglePause: function () {
        if (state.status === 'running') return api.pause();
        if (state.status === 'paused') return api.resume();
        return false;
      },

      /** Force a redraw (used when the tab becomes visible again). */
      refresh: function () {
        if (state.status === 'running') tick();
        else notifyUpdate();
      },

      destroy: function () { cancelTurn(); listeners = { update: [], flag: [], state: [] }; },

      snapshot: snapshot
    };

    return api;
  }

  global.ChessClock = { create: createClock, format: format, describe: describe, MODES: MODES };
})(window);
