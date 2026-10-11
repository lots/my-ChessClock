/*!
 * verify-ui.mjs - drives the real UI in a real browser and captures screenshots.
 *
 *   node tools/verify-ui.mjs
 *
 * It serves the folder itself (no separate terminal needed), walks through the
 * menu, settings, help and clock screens at phone and desktop sizes, checks the
 * behaviour that matters in a match, and reports any console error.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = path.join(ROOT, '.tmp', 'shots');
const PORT = Number(process.env.PORT || 8123);
const BASE = 'http://127.0.0.1:' + PORT;

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean);

const chrome = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!chrome) {
  console.error('No Chrome or Edge found. Set CHROME_PATH.');
  process.exit(1);
}

process.env.PORT = String(PORT);
process.env.HOST = '127.0.0.1';
await import('./serve.mjs');

fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const problems = [];

/**
 * A single assertion helper, called in whichever of two shapes reads better:
 *
 *   check(name, condition, detail)   condition is a boolean
 *   check(name, actual, expected)    anything else is compared by value
 *
 * The second shape exists so that an assertion can never silently degrade into
 * a truthiness test: passing a value as the condition is the classic way to
 * write a test that always passes.
 */
const check = (name, actual, expected) => {
  let ok;
  let detail = '';
  if (typeof actual === 'boolean' && typeof expected === 'boolean') {
    // Both sides boolean: the expectation is the value, in either direction.
    ok = actual === expected;
    if (!ok) detail = 'expected ' + expected + ', got ' + actual;
  } else if (typeof actual === 'boolean') {
    // Condition form: the second argument is the condition, the third is a note.
    ok = actual;
    if (expected !== undefined) detail = String(expected);
  } else {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    ok = a === e;
    detail = ok ? '' : 'expected ' + e + ', got ' + a;
  }
  results.push({ name, ok, detail });
  if (process.env.VERBOSE) console.log((ok ? '  ok   ' : '  FAIL ') + name + (ok ? '' : '  [' + detail + ']'));
  if (!ok) problems.push(name + (detail ? ' -> ' + detail : ''));
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Is the element actually painted? Asserting a class name only proves that the
 * script asked for something; an assertion has to be about the result.
 */
async function rendered(selector) {
  return page.$eval(selector, (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
}

/** The time-control fields that are really on screen, by name. */
async function visibleFields() {
  return page.$$eval('.cc-fields .cc-field', (els) => els
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
    .map((el) => el.getAttribute('data-field')));
}

// Puppeteer reloads the page whenever isMobile / hasTouch change, so those two
// flags (and the scale factor) stay constant and only the size varies.
const EMULATION = { deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const PHONE = Object.assign({ width: 390, height: 844 }, EMULATION);
const LANDSCAPE = Object.assign({ width: 844, height: 390 }, EMULATION);
const DESKTOP = Object.assign({ width: 1280, height: 900 }, EMULATION);

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ['--hide-scrollbars', '--disable-gpu', '--force-color-profile=srgb', '--mute-audio', '--lang=en-US']
});
const page = await browser.newPage();

page.on('console', (m) => { if (m.type() === 'error') problems.push('console error: ' + m.text()); });
page.on('pageerror', (e) => problems.push('page error: ' + e.message));
page.on('requestfailed', (r) => problems.push('request failed: ' + r.url()));
page.on('response', (r) => { if (r.status() >= 400) problems.push('http ' + r.status() + ': ' + r.url()); });

async function shot(name, viewport) {
  if (viewport) await page.setViewport(viewport);
  await sleep(320);
  await page.screenshot({ path: path.join(SHOTS, name + '.png') });
}

async function tap(selector) {
  try {
    await page.waitForSelector(selector, { visible: true, timeout: 5000 });
    // Puppeteer only scrolls a target just far enough to be on screen, which can
    // leave it underneath the opaque navbar. Centre it, then refuse to click
    // through whatever is on top: a silently mis-aimed click is the kind of bug
    // that makes an entire suite lie.
    await page.$eval(selector, (el) => el.scrollIntoView({ block: 'center', inline: 'center' }));
    await sleep(90);
    const blocked = await page.$eval(selector, (el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      if (!top) return 'nothing (off screen?)';
      if (top === el || el.contains(top)) return null;
      return top.tagName + '.' + String(top.className).slice(0, 60);
    });
    if (blocked) problems.push('tap target ' + selector + ' is covered by ' + blocked);
    await page.click(selector);
    await sleep(240);
    return !blocked;
  } catch (err) {
    // A missing element is a failed step, not a reason to abandon the run: the
    // rest of the suite still reports, which is what makes it diagnosable.
    problems.push('could not tap ' + selector + ' (' + String(err.message).split('\n')[0] + ')');
    return false;
  }
}

/* ------------------------------------------------------------- boot & menu */

await page.setViewport(DESKTOP);
await page.goto(BASE + '/index.html', { waitUntil: 'networkidle0' });
await page.waitForSelector('.page-current .cc-hero-title', { timeout: 8000 });
await sleep(400);

check('the menu page rendered', await page.$eval('.page-current', (el) => el.getAttribute('data-name')), 'menu');
check('an English browser gets an English interface',
  await page.$eval('.cc-hero-title', (el) => el.textContent.trim()), 'CoQ Weiqi/Chess Clock');
check('the browser tab carries the app name', await page.title(), 'CoQ Weiqi/Chess Clock');
check('the router redirected the bare path', await page.$eval('#app', (el) => !!el.querySelector('.view-main')));
check('the language control shows both languages',
  await page.$$eval('[data-seg="lang"] .button', (els) => els.map((e) => e.textContent.trim())),
  ['EN', '华文']);
const fieldBox = await page.$eval('#cc-name0', (el) => {
  const s = getComputedStyle(el);
  return { border: s.borderTopWidth, padding: s.padding, radius: s.borderRadius };
});
check('Framework7 leaves the themed fields alone',
  fieldBox.border === '1px' && fieldBox.padding === '10px', JSON.stringify(fieldBox));
const navbarBg = await page.evaluate(() => getComputedStyle(document.querySelector('.navbar-bg'), '::after').backgroundImage);
check('the navbar background stays opaque while scrolling', navbarBg === 'none', navbarBg);
await shot('menu-desktop-classic');

/* ------------------------------------------------------------ language swap */

await tap('[data-lang="zh"]');
check('switching to Chinese retranslates the menu',
  await page.$eval('.cc-hero-title', (el) => el.textContent.trim()), 'CoQ棋钟');
check('the browser tab name is localised too', await page.title(), 'CoQ棋钟');
check('the start button is translated',
  await page.$eval('#cc-start span:last-child', (el) => el.textContent.trim()), '开始');
await page.setViewport(PHONE);
await shot('menu-phone-zh');

await tap('[data-lang="en"]');
check('switching back to English works',
  await page.$eval('.cc-hero-title', (el) => el.textContent.trim()), 'CoQ Weiqi/Chess Clock');

/* --------------------------------------------------------------- the themes */

const themeNames = ['classic', 'midnight', 'contrast'];
for (const theme of themeNames) {
  await tap('[data-theme-id="' + theme + '"]');
  check('theme ' + theme + ' is applied to <html>',
    await page.evaluate(() => document.documentElement.getAttribute('data-theme')), theme);
  check('theme ' + theme + ' is marked active in the picker',
    await page.$eval('[data-theme-id="' + theme + '"]', (el) => el.classList.contains('is-active')), true);
  check('theme ' + theme + ' recolours the page background',
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 
    theme === 'classic' ? 'rgb(244, 239, 230)' : (theme === 'midnight' ? 'rgb(8, 13, 19)' : 'rgb(0, 0, 0)'));
  await shot('menu-phone-' + theme, PHONE);
}

/* ---------------------------------------------------------- time control UI */

await tap('[data-theme-id="classic"]');
await tap('[data-mode="increment"]');
check('increment mode is selected',
  await page.$eval('[data-mode="increment"]', (el) => el.classList.contains('active')), true);
await tap('[data-preset="10-5"]');
check('picking 10+5 updates the summary',
  await page.$eval('#cc-summary', (el) => el.textContent.trim()), '10+5');
check('increment mode shows exactly the main time and the increment',
  await visibleFields(), ['minutes', 'bonus']);
check('picking 10+5 updates the minutes field',
  await page.$eval('#cc-minutes', (el) => el.value), '10');
check('picking 10+5 updates the increment field',
  await page.$eval('#cc-bonus', (el) => el.value), '5');

await tap('[data-stepper="minutes"][data-delta="1"]');
check('the stepper advances the minutes', await page.$eval('#cc-minutes', (el) => el.value), '11');
await tap('[data-stepper="minutes"][data-delta="-1"]');

await tap('[data-mode="simple"]');
check('simple mode really hides the increment field, leaving only the main time',
  await visibleFields(), ['minutes']);
await tap('[data-mode="delay"]');
check('delay mode relabels the bonus field',
  await page.$eval('#cc-bonus-label', (el) => el.textContent.trim()), 'Delay (sec)');
await tap('[data-mode="increment"]');
await tap('[data-preset="10-5"]');

/* the first mover */
check('the menu offers a first-to-move choice',
  await page.$$eval('[data-seg="first"] .button', (els) => els.map((e) => e.textContent.trim())),
  ['Black', 'White']);
check('Black moves first by default',
  await page.$eval('[data-first="black"]', (el) => el.classList.contains('active')), true);
await tap('[data-first="white"]');
check('switching the first mover to White re-labels both halves',
  await page.$$eval('.cc-colour', (els) => els.map((e) => e.textContent.trim())), ['White', 'Black']);
await tap('[data-first="black"]');
check('and switching back puts Black first again',
  await page.$$eval('.cc-colour', (els) => els.map((e) => e.textContent.trim())), ['Black', 'White']);

check('both name fields show the neutral placeholder',
  await page.$$eval('#cc-name0, #cc-name1', (els) => els.map((e) => e.getAttribute('placeholder'))),
  ['---', '---']);

await page.type('#cc-name0', 'Wei');
await page.type('#cc-name1', 'Anand');
await shot('menu-phone-configured', PHONE);

/* -------------------------------------------------------------- the clock */

await tap('#cc-start');
await sleep(500);
check('the clock display opened',
  await page.$eval('#cc-clock', (el) => el.classList.contains('modal-in')), true);
check('the game starts the moment the display opens',
  await page.$eval('#cc-stage', (el) => el.getAttribute('data-status')), 'running');
check('both player names reach the display',
  await page.$$eval('.cc-name', (els) => els.map((e) => e.textContent.trim())), ['Wei', 'Anand']);
check('the halves are labelled Black and White',
  await page.$$eval('.cc-colour', (els) => els.map((e) => e.textContent.trim())), ['Black', 'White']);
check('the first mover, Black, is the one on the clock',
  await page.$$eval('.cc-side', (sides) => sides.map((s) => s.classList.contains('is-active'))), [true, false]);
check('Black is already spending time',
  await page.$eval('.cc-side[data-side="0"] .cc-time', (el) => el.textContent.trim() !== '10:00'), true);
check('while White has not been touched yet',
  await page.$eval('.cc-side[data-side="1"] .cc-time', (el) => el.textContent.trim()), '10:00');
await shot('clock-portrait-start', PHONE);

const fits = await page.$$eval('.cc-side', (sides) => sides.map((s) => {
  const time = s.querySelector('.cc-time');
  const wrap = s.querySelector('.cc-time-wrap');
  return { w: time.scrollWidth, avail: wrap.clientWidth, fs: getComputedStyle(time).fontSize };
}));
check('the digits fit their half of the display',
  fits.every((f) => f.w <= f.avail + 1), JSON.stringify(fits));

const nameFits = await page.$$eval('.cc-name', (els) => els.map((e) => e.scrollWidth <= e.clientWidth + 1));
check('long player names are clipped rather than overflowing', nameFits.every(Boolean));

/* the hand-over: tapping the half that is on move passes the turn over */
await page.click('.cc-side[data-side="0"]');
await sleep(900);
const handover = await page.evaluate(() => ({
  status: document.querySelector('#cc-stage').getAttribute('data-status'),
  blackActive: document.querySelector('.cc-side[data-side="0"]').classList.contains('is-active'),
  whiteActive: document.querySelector('.cc-side[data-side="1"]').classList.contains('is-active'),
  blackMoves: document.querySelector('.cc-side[data-side="0"] .cc-move-count').textContent.trim(),
  whiteTime: document.querySelector('.cc-side[data-side="1"] .cc-time').textContent.trim()
}));
check('the hand-over keeps the game running', handover.status, 'running');
check('Black comes off the clock', handover.blackActive, false);
check('White goes on the clock', handover.whiteActive, true);
check('Black is credited with the move', handover.blackMoves, '1');
check('White starts spending time', handover.whiteTime !== '10:00', handover.whiteTime);

const blackFrozen = await page.$eval('.cc-side[data-side="0"] .cc-time', (el) => el.textContent.trim());
await sleep(1200);
check('the half that is off the clock does not move',
  await page.$eval('.cc-side[data-side="0"] .cc-time', (el) => el.textContent.trim()), blackFrozen);
await shot('clock-portrait-running');

/* a tap on the half that is not on move must be refused */
await page.click('.cc-side[data-side="0"]');
await sleep(250);
check('tapping the idle half is ignored',
  await page.$eval('.cc-side[data-side="1"]', (el) => el.classList.contains('is-active')), true);
check('and no extra move is credited for it',
  await page.$eval('.cc-side[data-side="0"] .cc-move-count', (el) => el.textContent.trim()), '1');

/* pause */
await page.click('.cc-mid-btn[data-act="pause"]');
await sleep(400);
check('pause shows the paused state',
  await page.$eval('#cc-stage', (el) => el.getAttribute('data-status')), 'paused');
check('pause reveals the paused pill',
  await page.$eval('#cc-center', (el) => !el.hidden), true);
const pausedTime = await page.$eval('.cc-side[data-side="1"] .cc-time', (el) => el.textContent.trim());
await sleep(1200);
check('a paused clock does not move',
  await page.$eval('.cc-side[data-side="1"] .cc-time', (el) => el.textContent.trim()), pausedTime);
await shot('clock-portrait-paused', PHONE);

await page.click('.cc-mid-btn[data-act="pause"]');
await sleep(300);

/* reset: back to the tap-to-start state, after confirming */
await tap('.cc-mid-btn[data-act="reset"]');
await page.waitForSelector('.dialog-buttons .dialog-button', { visible: true, timeout: 4000 });
check('reset asks first instead of clearing a running game',
  await page.$eval('#cc-stage', (el) => el.getAttribute('data-status')), 'running');
await page.click('.dialog-buttons .dialog-button:last-child');
await sleep(450);
check('confirming returns the clock to the tap-to-start state',
  await page.$eval('#cc-stage', (el) => el.getAttribute('data-status')), 'ready');
check('with both clocks restored in full',
  await page.$$eval('.cc-time', (els) => els.map((e) => e.textContent.trim())), ['10:00', '10:00']);
check('and the hint names whose side starts it',
  await page.$eval('.cc-side[data-side="0"] .cc-side-hint', (el) => el.textContent.trim()),
  'Tap Black\u2019s side to start');
check('the other half shows the move counter instead',
  await page.$eval('.cc-side[data-side="0"] .cc-move-count', (el) => el.textContent.trim()), '0');
await shot('clock-portrait-ready', PHONE);

/* start a fresh game so the sections below see a live clock */
await page.click('.cc-side[data-side="0"]');
await sleep(250);
check('and it starts again from the tap', 
  await page.$eval('#cc-stage', (el) => el.getAttribute('data-status')), 'running');

/* landscape */
await page.setViewport(LANDSCAPE);
await sleep(400);
const landFits = await page.$$eval('.cc-side', (sides) => sides.map((s) => {
  const time = s.querySelector('.cc-time');
  return time.scrollWidth <= s.querySelector('.cc-time-wrap').clientWidth + 1;
}));
check('the digits still fit in landscape', landFits.every(Boolean), JSON.stringify(landFits));
check('the control bar becomes a vertical strip',
  await page.evaluate(() => getComputedStyle(document.querySelector('.cc-mid')).flexDirection), 'column');
await shot('clock-landscape-running');

/* flag */
await page.evaluate(() => {
  const c = window.ChessClockApp.clock();
  c.reset();
  c.configure({ mode: 'simple', baseMs: 1200, bonusMs: 0 });
});
await page.click('.cc-side[data-side="0"]');
await sleep(1800);
const flagState = await page.evaluate(() => ({
  status: document.querySelector('#cc-stage').getAttribute('data-status'),
  shown: !document.querySelector('#cc-flag').hidden,
  body: document.querySelector('#cc-flag-body').textContent.trim(),
  flaggedSide: document.querySelector('.cc-side[data-side="0"]').classList.contains('is-flagged'),
  zero: document.querySelector('.cc-side[data-side="0"] .cc-time').textContent.trim()
}));
check('the clock flags when time runs out', flagState.status, 'flagged');
check('the flag panel appears', flagState.shown, true);
check('the flagged player is named in the verdict', /Wei/.test(flagState.body) && /Anand/.test(flagState.body), flagState.body);
check('the flagged half is highlighted red', flagState.flaggedSide, true);
check('the flagged clock reads zero', flagState.zero, '00.0');
await shot('clock-landscape-flag');

await tap('#cc-newgame');
check('a new game clears the flag panel',
  await page.$eval('#cc-flag', (el) => el.hidden), true);

/* extra: a long control must render hours */
await page.evaluate(() => {
  const c = window.ChessClockApp.clock();
  c.reset();
  c.configure({ mode: 'increment', baseMs: 90 * 60000, bonusMs: 30000, names: ['Wei', 'Anand'] });
});
await sleep(300);
check('a 90 minute control is displayed as hours',
  await page.$eval('.cc-time', (el) => el.textContent.trim()), '1:30:00');
await shot('clock-landscape-90min');

/* the clock face in every theme */
for (const theme of ['midnight', 'contrast', 'classic']) {
  await page.evaluate((id) => window.Themes.set(id), theme);
  await sleep(420);
  const colours = await page.$$eval('.cc-time', (els) => els.map((e) => getComputedStyle(e).color));
  check('the clock face re-renders for the ' + theme + ' theme',
    colours.length === 2 && colours.every((c) => c && c !== 'rgba(0, 0, 0, 0)'), JSON.stringify(colours));
  await shot('clock-landscape-' + theme);
}

/* leaving a live game and starting again must give a fresh clock */
await page.evaluate(() => {
  const c = window.ChessClockApp.clock();
  c.reset();
  c.configure({ mode: 'simple', baseMs: 60000, bonusMs: 0, names: ['Wei', 'Anand'] });
});
await page.click('.cc-side[data-side="0"]');
await sleep(500);
check('a live game is running before we leave it',
  await page.$eval('#cc-stage', (el) => el.getAttribute('data-status')), 'running');
await tap('.cc-mid-btn[data-act="exit"]');
await page.waitForSelector('.dialog-buttons .dialog-button', { visible: true, timeout: 4000 });
await page.click('.dialog-buttons .dialog-button:last-child');
await sleep(500);
check('leaving a live game asks for confirmation and closes the clock',
  await page.$eval('#cc-clock', (el) => !el.classList.contains('modal-in')), true);

await tap('#cc-start');
await sleep(600);
check('starting again gives a brand new, already running clock',
  await page.$eval('#cc-stage', (el) => el.getAttribute('data-status')), 'running');
// START rebuilds the clock from the menu control (10+5), not from whatever the
// abandoned game had been configured to via the debug handle.
check('starting again rebuilds from the menu control, not the abandoned game',
  await page.$eval('.cc-side[data-side="1"] .cc-time', (el) => el.textContent.trim()), '10:00');
check('and the first mover starts it off',
  await page.$$eval('.cc-side', (sides) => sides.map((s) => s.classList.contains('is-active'))), [true, false]);
check('and the badges agree with the menu',
  await page.$eval('#cc-summary', (el) => el.textContent.trim()), '10+5');
check('and the move counters cleared',
  await page.$$eval('.cc-move-count', (els) => els.map((e) => e.textContent.trim())), ['0', '0']);

/* leave the clock - it is running, so it asks before abandoning the game */
await page.setViewport(PHONE);
await sleep(300);
await tap('.cc-mid-btn[data-act="exit"]');
await page.waitForSelector('.dialog-buttons .dialog-button', { visible: true, timeout: 4000 });
await page.click('.dialog-buttons .dialog-button:last-child');
await sleep(500);
check('the clock closes back to the menu',
  await page.$eval('#cc-clock', (el) => !el.classList.contains('modal-in')), true);

/* ------------------------------------------------------------- byo-yomi */

await tap('[data-mode="byoyomi"]');
if (process.env.VERBOSE) {
  console.log('DIAG ' + JSON.stringify(await page.evaluate(() => {
    const b = document.querySelector('[data-mode="byoyomi"]');
    const r = b ? b.getBoundingClientRect() : null;
    const top = r ? document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) : null;
    return {
      mode: window.ChessClockApp.control().mode,
      pages: Array.from(document.querySelectorAll('.page')).map((p) => p.getAttribute('data-name') + (p.classList.contains('page-current') ? '*' : '')),
      byoButtons: document.querySelectorAll('[data-mode="byoyomi"]').length,
      modalIn: Array.from(document.querySelectorAll('.modal-in')).map((m) => m.id || m.className),
      dialogs: document.querySelectorAll('.dialog').length,
      rect: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
      onTop: top ? top.tagName + '.' + String(top.className).slice(0, 60) : 'none',
      viewport: window.innerWidth + 'x' + window.innerHeight
    };
  })));
}
check('byo-yomi can be selected in the mode row',
  await page.$eval('[data-mode="byoyomi"]', (el) => el.classList.contains('active')), true);
check('byo-yomi really shows all three fields',
  await visibleFields(), ['minutes', 'bonus', 'periods']);
check('and the period field is painted, not merely classed',
  await rendered('[data-field="periods"]'), true);
check('the bonus field is relabelled as the period length',
  await page.$eval('#cc-bonus-label', (el) => el.textContent.trim()), 'Period (sec)');
check('the byo-yomi mode explains itself',
  (await page.$eval('#cc-mode-desc', (el) => el.textContent.trim())).indexOf('Go') >= 0, 'ok');

check('the byo-yomi presets include 10+3x20',
  (await page.$$eval('.cc-preset', (els) => els.map((e) => e.getAttribute('data-preset')))).indexOf('10-3-20') >= 0,
  JSON.stringify(await page.$$eval('.cc-preset', (els) => els.map((e) => e.getAttribute('data-preset')))));
await tap('[data-preset="10-3-20"]');
check('picking 10+3x20 sets the badge',
  await page.$eval('#cc-summary', (el) => el.textContent.trim()), '10+3\u00d720s');
check('and fills in 3 periods of 20 seconds',
  await page.$$eval('.cc-fields .cc-field:not(.is-hidden) .cc-input', (els) => els.map((e) => e.value)), ['10', '20', '3']);
check('with that preset shown as the active one',
  await page.$$eval('.cc-preset.is-active', (els) => els.map((e) => e.textContent.trim())), ['10+3\u00d720']);

await tap('[data-preset="10-3-30"]');
check('a byo-yomi preset sets the main time',
  await page.$eval('#cc-minutes', (el) => el.value), '10');
check('a byo-yomi preset sets the period length',
  await page.$eval('#cc-bonus', (el) => el.value), '30');
check('a byo-yomi preset sets the period count',
  await page.$eval('#cc-periods', (el) => el.value), '3');
check('the badge reads main + periods x period seconds',
  await page.$eval('#cc-summary', (el) => el.textContent.trim()), '10+3\u00d730s');
await tap('[data-stepper="periods"][data-delta="1"]');
check('the period count can be stepped up',
  await page.$eval('#cc-periods', (el) => el.value), '4');
await tap('[data-stepper="periods"][data-delta="-1"]');
check('and back down again', await page.$eval('#cc-periods', (el) => el.value), '3');
await shot('menu-phone-byoyomi', PHONE);

await tap('#cc-start');
await sleep(500);
check('a byo-yomi game also starts immediately',
  await page.$eval('#cc-stage', (el) => el.getAttribute('data-status')), 'running');
check('with Black on the clock and full main time',
  await page.$$eval('.cc-side', (sides) => sides.map((s) => s.classList.contains('is-active'))), [true, false]);
check('and no period readout until overtime starts',
  await page.$eval('.cc-side[data-side="0"] .cc-byo', (el) => el.hidden), true);

/* A realistic overtime display: 30-second periods, so the digits stay calm. */
await page.evaluate(() => {
  const c = window.ChessClockApp.clock();
  c.reset();
  c.configure({ mode: 'byoyomi', baseMs: 1000, bonusMs: 30000, periods: 3, names: ['Wei', 'Anand'] });
});
await page.setViewport(LANDSCAPE);
await sleep(300);
await page.click('.cc-side[data-side="0"]');
await sleep(2500);
check('a 30-second period keeps the digits out of the critical colour',
  await page.$eval('.cc-side[data-side="0"]', (el) => el.classList.contains('is-critical')), false);
check('and the readout names the period length',
  await page.$eval('.cc-side[data-side="0"] .cc-byo', (el) => el.textContent.trim()), '3 \u00d7 30s');
await shot('clock-landscape-byoyomi');
await page.setViewport(PHONE);
await sleep(300);

/* Short main time and short periods, driven from the engine so the test is quick. */
await page.evaluate(() => {
  const c = window.ChessClockApp.clock();
  c.reset();
  c.configure({ mode: 'byoyomi', baseMs: 2000, bonusMs: 2000, periods: 3, names: ['', ''] });
});
await page.click('.cc-side[data-side="0"]');
await sleep(2400);
const firstPeriod = await page.evaluate(() => ({
  inByo: document.querySelector('.cc-side[data-side="0"]').classList.contains('is-byo'),
  shown: !document.querySelector('.cc-side[data-side="0"] .cc-byo').hidden,
  pill: document.querySelector('.cc-side[data-side="0"] .cc-byo').textContent.trim()
}));
check('the main time gives way to the first period', firstPeriod.inByo, true);
check('the period readout becomes visible', firstPeriod.shown, true);
check('and shows how many periods are left', firstPeriod.pill, '3 \u00d7 2s');
await shot('clock-portrait-byoyomi', PHONE);

await sleep(2100);
check('letting a period expire lowers the readout',
  await page.$eval('.cc-side[data-side="0"] .cc-byo', (el) => el.textContent.trim()), '2 \u00d7 2s');
await sleep(4200);
check('using up every period flags the player',
  await page.$eval('#cc-stage', (el) => el.getAttribute('data-status')), 'flagged');
check('and the verdict is phrased in byo-yomi terms, naming the colours when no name was typed',
  await page.$eval('#cc-flag-body', (el) => el.textContent.trim()),
  'Black ran out of byo-yomi periods. White wins.');
await shot('clock-portrait-byoyomi-flag', PHONE);
await tap('#cc-backmenu');
await sleep(500);
check('closing the byo-yomi game returns to the menu',
  await page.$eval('#cc-clock', (el) => !el.classList.contains('modal-in')), true);

/* Back to a chess control, so the persistence checks below have a known value. */
await tap('[data-mode="increment"]');
check('leaving byo-yomi drops the period field but keeps the increment one',
  await visibleFields(), ['minutes', 'bonus']);
check('and the period field is no longer painted',
  await rendered('[data-field="periods"]'), false);
await tap('[data-preset="10-5"]');
check('and the time control returns to 10+5',
  await page.$eval('#cc-summary', (el) => el.textContent.trim()), '10+5');

/* ------------------------------------------------------- settings and help */

await page.setViewport(DESKTOP);
await sleep(300);
await tap('[data-nav="/settings/"]');
await sleep(500);
check('the settings page opened',
  await page.$eval('.page-current', (el) => el.getAttribute('data-name')), 'settings');
check('every setting has a switch',
  await page.$$eval('[data-setting]', (els) => els.length), 7);
const faceToFaceOn = await page.$eval('[data-setting="faceToFace"]', (el) => el.checked);
check('the settings reflect the stored values', faceToFaceOn, true);
await shot('settings-desktop');

await page.setViewport(PHONE);
await tap('.cc-row:has([data-setting="dim"]) .toggle-icon');
const dimOff = await page.$eval('[data-setting="dim"]', (el) => el.checked);
check('tapping the switch turns the setting off', dimOff, false);
await tap('.cc-row:has([data-setting="dim"]) .toggle-icon');
const dimBackOn = await page.$eval('[data-setting="dim"]', (el) => el.checked);
check('tapping it again turns it back on', dimBackOn, true);
await shot('settings-phone');

/* the Back button on a sub-page has to return to the Menu page */
await tap('.page-current .cc-back');
await sleep(600);
check('the Back button on Settings returns to the menu',
  await page.$eval('.page-current', (el) => el.getAttribute('data-name')), 'menu');

await tap('[data-nav="/help/"]');
await sleep(500);
check('the help page opened',
  await page.$eval('.page-current', (el) => el.getAttribute('data-name')), 'help');
const helpLines = await page.$$eval('.page-current .help-line', (els) => els.length);
check('the help text is rendered from the dictionary', helpLines >= 8, helpLines);
check('the help page explains byo-yomi',
  await page.$$eval('.page-current .cc-help', (els) => els.length) >= 5,
  await page.$$eval('.page-current .cc-help', (els) => els.length));
await shot('help-phone', PHONE);

await tap('.page-current .cc-back');
await sleep(600);
check('the Back button on About & Help returns to the menu',
  await page.$eval('.page-current', (el) => el.getAttribute('data-name')), 'menu');

/* ------------------------------------------------------- persistence check */

const stored = await page.evaluate(() => ({
  lang: localStorage.getItem('cc.lang'),
  theme: localStorage.getItem('cc.theme'),
  control: JSON.parse(localStorage.getItem('cc.control') || 'null'),
  settings: JSON.parse(localStorage.getItem('cc.settings') || 'null')
}));
check('the language choice is persisted', !!stored.lang, JSON.stringify(stored.lang));
check('the theme choice is persisted', stored.theme, 'classic');
check('the time control is persisted', stored.control && stored.control.baseMs, 600000);
check('the first mover is persisted', stored.control && stored.control.first, 'black');
check('the settings are persisted', stored.settings && stored.settings.faceToFace, true);

/* reload once to prove the choices come back */
await page.reload({ waitUntil: 'networkidle0' });
await page.waitForSelector('.page-current .cc-hero-title');
await sleep(400);
check('the saved theme survives a reload',
  await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'classic');
check('the saved control survives a reload',
  await page.$eval('#cc-summary', (el) => el.textContent.trim()), '10+5');

/* ------------------------------------------ straight from the file system */

const fileUrl = 'file:///' + path.join(ROOT, 'index.html').split(path.sep).join('/');
const filePage = await browser.newPage();
const fileProblems = [];
filePage.on('pageerror', (e) => fileProblems.push('file:// page error: ' + e.message));
filePage.on('console', (m) => {
  if (m.type() !== 'error') return;
  const text = m.text();
  // A file:// page cannot register a service worker or fetch the manifest;
  // neither is needed for the double-click path.
  if (/manifest|service ?worker|Failed to load resource/i.test(text)) return;
  fileProblems.push('file:// console error: ' + text);
});
await filePage.setViewport(PHONE);
await filePage.goto(fileUrl, { waitUntil: 'load' });
await filePage.waitForSelector('.page-current .cc-hero-title', { timeout: 8000 });
check('the app also runs straight from file:// (double-click index.html)',
  (await filePage.$eval('.cc-hero-title', (el) => el.textContent.trim())).length > 0, 'ok');
await filePage.click('#cc-start');
await sleep(700);
check('and the clock opens from file://',
  await filePage.$eval('#cc-clock', (el) => el.classList.contains('modal-in')), true);
check('with both clocks ready to run',
  await filePage.$$eval('.cc-time', (els) => els.length), 2);
await filePage.close();
for (const p of fileProblems) problems.push(p);

// ------------- the clock must fill the viewport on every kind of screen --------------

// Framework7 centres popups on screens of 630x630 or larger, which once pushed the
// clock up and to the left on a plain desktop window. Geometry is asserted here on a
// cold load, so the popup's own labels and tooltips are checked before any language
// switch has ever been made.
const GEO_VIEWPORTS = [
  ['desktop 1280x800', { width: 1280, height: 800, isMobile: false, hasTouch: false, deviceScaleFactor: 1 }],
  ['tablet 1024x768', { width: 1024, height: 768, isMobile: false, hasTouch: false, deviceScaleFactor: 1 }],
  ['laptop 900x700', { width: 900, height: 700, isMobile: false, hasTouch: false, deviceScaleFactor: 1 }],
  ['small window 640x480', { width: 640, height: 480, isMobile: false, hasTouch: false, deviceScaleFactor: 1 }],
  ['tall window 900x1200', { width: 900, height: 1200, isMobile: false, hasTouch: false, deviceScaleFactor: 1 }],
  ['phone portrait 390x844', PHONE],
  ['phone landscape 844x390', LANDSCAPE]
];

const geoPage = await browser.newPage();
const geoErrors = [];
geoPage.on('pageerror', (e) => geoErrors.push('geometry page error: ' + e.message));
let coldLoad = null;

// The main page has been customising things all along, so the geometry pass
// starts from a genuinely clean device profile.
await geoPage.goto(BASE + '/index.html', { waitUntil: 'load' });
await geoPage.evaluate(() => { try { localStorage.clear(); } catch (e) { /* ignore */ } });

for (const [label, viewport] of GEO_VIEWPORTS) {
  await geoPage.setViewport(viewport);
  await sleep(220);
  await geoPage.goto(BASE + '/index.html', { waitUntil: 'load' });
  await geoPage.waitForSelector('.page-current .cc-hero-title', { timeout: 8000 });
  await sleep(260);
  await geoPage.click('#cc-start');
  await sleep(650);
  const geo = await geoPage.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const p = document.querySelector('#cc-clock').getBoundingClientRect();
    const buttons = Array.from(document.querySelectorAll('.cc-mid-btn')).map((b) => {
      const r = b.getBoundingClientRect();
      return {
        act: b.getAttribute('data-act'),
        inside: r.left >= -1 && r.top >= -1 && r.right <= vw + 1 && r.bottom <= vh + 1,
        title: (b.getAttribute('title') || '').trim()
      };
    });
    const sides = Array.from(document.querySelectorAll('.cc-side')).map((s) => {
      const r = s.getBoundingClientRect();
      return r.left >= -1 && r.top >= -1 && r.right <= vw + 1 && r.bottom <= vh + 1;
    });
    const img = document.querySelector('.cc-mid-logo img');
    const names = Array.from(document.querySelectorAll('.cc-name')).map((n) => ({
      text: n.textContent.trim(),
      fits: n.scrollWidth <= n.clientWidth + 1
    }));
    return {
      vw, vh,
      names,
      popup: { x: Math.round(p.x), y: Math.round(p.y), w: Math.round(p.width), h: Math.round(p.height) },
      buttons, sides,
      logo: !!img && img.getBoundingClientRect().width > 0,
      firstColour: (document.querySelector('.cc-side[data-side="0"] .cc-colour') || {}).textContent.trim(),
      texts: {
        moves: (document.querySelector('.cc-moves-word') || {}).textContent.trim(),
        flag: (document.querySelector('.cc-flag-title') || {}).textContent.trim(),
        newGame: (document.querySelector('#cc-newgame') || {}).textContent.trim(),
        back: (document.querySelector('#cc-backmenu') || {}).textContent.trim()
      }
    };
  });
  coldLoad = Object.assign({ firstColour: geo.firstColour }, geo.texts);

  check('the clock exactly covers the viewport at ' + label,
    geo.popup.x === 0 && geo.popup.y === 0 && geo.popup.w === geo.vw && geo.popup.h === geo.vh,
    JSON.stringify(geo.popup) + ' in ' + geo.vw + 'x' + geo.vh);
  check('both halves stay inside the screen at ' + label, geo.sides.every(Boolean), JSON.stringify(geo.sides));
  check('all four control-bar buttons stay on screen at ' + label,
    geo.buttons.length === 4 && geo.buttons.every((b) => b.inside),
    JSON.stringify(geo.buttons.map((b) => b.act + '=' + (b.inside ? 'in' : 'OUT'))));
  check('every control-bar button explains itself on hover at ' + label,
    geo.buttons.every((b) => b.title.length > 0),
    JSON.stringify(geo.buttons.map((b) => b.act + ':' + (b.title || 'NO TITLE'))));
  check('the clock page shows the app logo at ' + label, geo.logo, true);
  check('an unnamed seat shows the neutral placeholder at ' + label,
    geo.names.every((n) => n.text === '---'), JSON.stringify(geo.names));
  check('the default player names are not clipped at ' + label,
    geo.names.length === 2 && geo.names.every((n) => n.fits),
    JSON.stringify(geo.names));
  await geoPage.screenshot({ path: path.join(SHOTS, 'clock-' + label.split(' ')[0] + '.png') });
}

check('a cold load defaults to Black as the first mover', coldLoad.firstColour, 'Black');
check('the clock page is translated on a cold load (move counter)',
  coldLoad.moves.length > 0, JSON.stringify(coldLoad.moves));
check('the clock page is translated on a cold load (time-out heading)',
  coldLoad.flag.length > 0, JSON.stringify(coldLoad.flag));
check('the clock page is translated on a cold load (verdict buttons)',
  coldLoad.newGame.length > 0 && coldLoad.back.length > 0, JSON.stringify(coldLoad));
await geoPage.close();
for (const p of geoErrors) problems.push(p);

await browser.close();

/* ----------------------------------------------------------------- report */

fs.writeFileSync(path.join(SHOTS, 'report.json'), JSON.stringify({ results, problems }, null, 2));
const failed = results.filter((r) => !r.ok);
console.log('UI checks: ' + (results.length - failed.length) + '/' + results.length + ' passed');
for (const f of failed) console.log('  FAIL ' + f.name + (f.detail ? '  [' + f.detail + ']' : ''));
if (problems.length) {
  console.log('\nProblems reported by the browser:');
  for (const p of [...new Set(problems)]) console.log('  - ' + p);
}
console.log('\nScreenshots: ' + SHOTS);
process.exit(failed.length || problems.length ? 1 : 0);
