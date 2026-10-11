/*!
 * clock-test.mjs - deterministic tests for the timing engine.
 *
 *   npm test
 *
 * clock.js is a plain browser script, so it is given a minimal window and a
 * controllable performance.now() and then exercised move by move.
 */
let fakeNow = 0;
globalThis.window = globalThis;
globalThis.performance = { now: () => fakeNow };
globalThis.requestAnimationFrame = undefined;

await import('../js/clock.js');
const { create, format, describe } = globalThis.ChessClock;

let passed = 0;
const failures = [];

function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { passed++; return; }
  failures.push(label + '\n    expected ' + e + '\n    actual   ' + a);
}

function advance(ms) { fakeNow += ms; }

/* ------------------------------------------------------------ formatting */

check('format 1 hour', format(3600000), '1:00:00');
check('format 90 minutes', format(90 * 60000), '1:30:00');
check('format 10 minutes', format(600000), '10:00');
check('format 20 seconds is still MM:SS', format(20000), '00:20');
check('format 19.9 seconds shows tenths', format(19900), '19.9');
check('format 9.4 seconds', format(9400), '09.4');
check('format zero', format(0), '00.0');
check('format negative clamps', format(-5000), '00.0');
check('describe increment', describe({ baseMs: 300000, bonusMs: 3000, mode: 'increment' }), '5+3');
check('describe delay', describe({ baseMs: 600000, bonusMs: 5000, mode: 'delay' }), '10+5d');

/* ---------------------------------------------------------- simple mode */

let clock = create();
clock.configure({ mode: 'simple', baseMs: 60000, bonusMs: 0, names: ['A', 'B'] });
check('starts ready', clock.status, 'ready');
check('ready shows base time', clock.snapshot().text, ['01:00', '01:00']);

check('tap a side to start that clock', clock.press(0), true);
check('now running', clock.status, 'running');
check('active side is the one tapped', clock.active, 0);
check('the idle half is ignored', clock.press(1), false);

advance(5000);
check('running half counts down', clock.snapshot().text[0], '00:55');
check('idle half is untouched', clock.snapshot().text[1], '01:00');

check('the player on move may press', clock.press(0), true);
check('turn handed to the opponent', clock.active, 1);
check('one move recorded', clock.snapshot().moves, [1, 0]);
check('committed time kept', clock.snapshot().times[0], 55000);

advance(20000);
check('opponent now counts down', clock.snapshot().text[1], '00:40');
check('first clock frozen', clock.snapshot().text[0], '00:55');

/* ------------------------------------------------------------- pause/resume */

check('pause accepted', clock.pause(), true);
check('status paused', clock.status, 'paused');
advance(60000);
check('no time lost while paused', clock.snapshot().text[1], '00:40');
check('no move accepted while paused', clock.press(1), false);
check('resume accepted', clock.resume(), true);
advance(10000);
check('counting resumes', clock.snapshot().text[1], '00:30');
clock.destroy();

/* ------------------------------------------------------------- increment */

clock = create();
clock.configure({ mode: 'increment', baseMs: 300000, bonusMs: 3000 });
clock.press(0);
advance(10000);
clock.press(0);
check('increment is credited after the move', clock.snapshot().times[0], 293000);
check('increment lands on the mover only', clock.snapshot().times[1], 300000);
check('describe matches the control', describe(clock.config), '5+3');
clock.destroy();

/* ---------------------------------------------------------------- delay */

clock = create();
clock.configure({ mode: 'delay', baseMs: 300000, bonusMs: 5000 });
clock.press(0);
advance(4000);
check('within the delay the main clock does not move', clock.snapshot().text[0], '05:00');
clock.press(0);
check('a move inside the delay costs nothing', clock.snapshot().times[0], 300000);
check('the turn passed to the opponent', clock.active, 1);
advance(12000);
check('beyond the delay only the excess is charged', clock.snapshot().text[1], '04:53');
check('and the mover keeps every second of their delay', clock.snapshot().times[0], 300000);
clock.destroy();

/* ------------------------------------------------------------------ flag */

clock = create();
const flagged = [];
clock.on('flag', (snap) => flagged.push(snap.flagged));
clock.configure({ mode: 'simple', baseMs: 2000, bonusMs: 0 });
clock.press(0);
advance(2100);
clock.refresh();
check('a flag is reported once time runs out', clock.status, 'flagged');
check('the right player is flagged', clock.snapshot().flagged, 0);
check('flag listener fired', flagged, [0]);
check('flagged clock reads zero', clock.snapshot().text[0], '00.0');
check('no further presses are accepted', clock.press(0), false);
check('reset returns to ready', (clock.reset(), clock.status), 'ready');
check('reset restores both clocks', clock.snapshot().text, ['02.0', '02.0']);
clock.destroy();

/* ------------------------------------------- reconfiguration is deliberate */

clock = create();
clock.configure({ mode: 'simple', baseMs: 60000, bonusMs: 0 });
clock.press(0);
check('a running clock refuses to be reconfigured underneath the players',
  clock.configure({ mode: 'increment', baseMs: 1000, bonusMs: 60000 }), false);
check('and its time control is untouched', clock.config.baseMs, 60000);
check('and its mode is untouched', clock.config.mode, 'simple');
clock.pause();
check('a paused clock refuses too', clock.configure({ baseMs: 1000 }), false);
clock.reset();
check('once reset, a new time control is accepted',
  (clock.configure({ mode: 'increment', baseMs: 120000, bonusMs: 2000 }), clock.config.baseMs), 120000);
check('and the clock is ready again', clock.status, 'ready');
clock.destroy();

/* --------------------------------------------------------- low time signal */

clock = create();
const warnings = [];
clock.on('lowtime', (info) => warnings.push(info.seconds));
clock.configure({ mode: 'simple', baseMs: 12000 });
clock.press(0);
advance(2500);
clock.refresh();
check('final seconds are announced', warnings, [10]);
clock.destroy();

/* ------------------------------------------------- names can be set to none */

clock = create();
clock.configure({ mode: 'simple', baseMs: 60000, names: ['A', 'B'] });
check('names are stored as given', clock.snapshot().config.names, ['A', 'B']);
clock.configure({ mode: 'simple', baseMs: 60000 });
check('omitting names leaves the current ones alone', clock.snapshot().config.names, ['A', 'B']);
clock.configure({ mode: 'simple', baseMs: 60000, names: ['', ''] });
check('an empty name clears the seat instead of falling back',
  clock.snapshot().config.names, ['', '']);
clock.destroy();

/* ----------------------------------------------------------------- byo-yomi */

let byo = create();
const byoStarts = [];
const periodLosses = [];
byo.on('byostart', (e) => byoStarts.push(e.periodsLeft));
byo.on('period', (e) => periodLosses.push(e.periodsLeft));
byo.configure({ mode: 'byoyomi', baseMs: 10000, bonusMs: 30000, periods: 3, names: ['A', 'B'] });

check('byo-yomi: the badge reads main + periods x seconds',
  describe({ mode: 'byoyomi', baseMs: 1800000, bonusMs: 30000, periods: 5 }), '30+5\u00d730s');
check('byo-yomi: both clocks start on the main time', byo.snapshot().text, ['10.0', '10.0']);
check('byo-yomi: nobody is in overtime yet', byo.snapshot().inByo, [false, false]);

byo.press(0);
advance(4000);
check('byo-yomi: the main time counts down first', byo.snapshot().text[0], '06.0');
check('byo-yomi: and it is still main time', byo.snapshot().live[0].inByo, false);
byo.press(0);
check('byo-yomi: the main time is banked on the move', byo.snapshot().main[0], 6000);

advance(10000);
byo.refresh();
check('byo-yomi: the first period takes over when the main time runs out',
  byo.snapshot().live[1].inByo, true);
check('byo-yomi: and starts at its full length', byo.snapshot().text[1], '00:30');
check('byo-yomi: with every period still in hand', byo.snapshot().live[1].periodsLeft, 3);
check('byo-yomi: entering overtime is announced', byoStarts, [3]);

advance(20000);
byo.refresh();
check('byo-yomi: the period counts down', byo.snapshot().text[1], '10.0');
check('byo-yomi: no life is spent while the period is running',
  byo.snapshot().live[1].periodsLeft, 3);

advance(10000);
byo.refresh();
check('byo-yomi: letting a period expire is not yet a loss', byo.status, 'running');
check('byo-yomi: it costs exactly one period', byo.snapshot().live[1].periodsLeft, 2);
check('byo-yomi: and the next period starts full', byo.snapshot().text[1], '00:30');
check('byo-yomi: the loss of a period is announced', periodLosses, [2]);

byo.press(1);
check('byo-yomi: a completed move banks the periods already lost',
  byo.snapshot().live[1].periodsLeft, 2);
check('byo-yomi: and leaves the main time spent', byo.snapshot().main[1], 0);
check('byo-yomi: the turn passes to the opponent', byo.active, 0);

advance(6000);
byo.refresh();
check('byo-yomi: the other player enters overtime on their own clock',
  byo.snapshot().live[0].inByo, true);
check('byo-yomi: with their own untouched periods', byo.snapshot().live[0].periodsLeft, 3);

advance(90000);
byo.refresh();
check('byo-yomi: using up every period loses the game', byo.status, 'flagged');
check('byo-yomi: the player who ran out is the one flagged', byo.snapshot().flagged, 0);
check('byo-yomi: and they have no periods left', byo.snapshot().live[0].periodsLeft, 0);
byo.destroy();

/* ------------------------------ a pause must not hand out free overtime */

byo = create();
byo.configure({ mode: 'byoyomi', baseMs: 1000, bonusMs: 30000, periods: 3 });
byo.press(0);
advance(1000);
byo.refresh();
advance(10000);
byo.refresh();
check('byo-yomi: 20 seconds left in the first period', byo.snapshot().text[0], '00:20');
check('byo-yomi: pause is accepted mid-period', byo.pause(), true);
check('byo-yomi: the paused display still shows the period in progress',
  byo.snapshot().live[0].ms, 20000);
advance(120000);
check('byo-yomi: a long interruption costs nothing', byo.snapshot().live[0].ms, 20000);
byo.resume();
advance(5000);
check('byo-yomi: resuming continues the same period', byo.snapshot().text[0], '15.0');
check('byo-yomi: and does not hand back a fresh one', byo.snapshot().live[0].periodsLeft, 3);
advance(15000);
byo.refresh();
check('byo-yomi: the period still expires on schedule', byo.snapshot().live[0].periodsLeft, 2);
byo.destroy();

/* --------------------------- the same guarantee for a Bronstein delay */

clock = create();
clock.configure({ mode: 'delay', baseMs: 60000, bonusMs: 5000 });
clock.press(0);
advance(3000);
clock.pause();
advance(60000);
clock.resume();
advance(3000);
check('delay: a pause does not hand back a fresh delay', clock.snapshot().times[0], 59000);
clock.destroy();

/* ------------------------------------------------------------------ report */

if (failures.length) {
  console.error('FAILED ' + failures.length + ' check(s):');
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log('clock engine: ' + passed + ' checks passed');
