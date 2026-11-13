// Headless smoke test for Astraea (development only).
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => {
  if (!/Not implemented: HTMLCanvasElement/.test(e.message)) errors.push('jsdomError: ' + e.message);
});
vc.on('error', (...args) => errors.push('console.error: ' + args.join(' ')));

const dom = new JSDOM(html, {
  url: 'http://localhost:4173/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc,
});

const { window } = dom;

// --- stub canvas 2d ---
function makeCtx() {
  const gradient = { addColorStop: () => {} };
  return {
    canvas: null,
    clearRect() {}, beginPath() {}, arc() {}, fill() {}, stroke() {},
    moveTo() {}, lineTo() {}, closePath() {}, save() {}, restore() {},
    clip() {}, ellipse() {}, setTransform() {}, translate() {}, scale() {},
    createRadialGradient: () => gradient,
    createLinearGradient: () => gradient,
  };
}
window.HTMLCanvasElement.prototype.getContext = function () {
  if (!this.__ctx) this.__ctx = makeCtx();
  return this.__ctx;
};

// --- stub matchMedia ---
window.matchMedia = function () {
  return { matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} };
};
window.scrollTo = function () {};

window.addEventListener('error', (e) => errors.push('window error: ' + (e.error && e.error.stack || e.message)));

const scripts = ['js/astro.js', 'js/data-signs.js', 'js/data-daily.js', 'js/data-rituals.js', 'js/app.js'];
for (const file of scripts) {
  const code = fs.readFileSync(path.join(root, file), 'utf8');
  try {
    window.eval(code);
  } catch (e) {
    errors.push('eval ' + file + ': ' + e.stack);
  }
}

function assert(cond, msg) {
  if (!cond) errors.push('ASSERT: ' + msg);
  else console.log('  ok  ' + msg);
}

const doc = window.document;
assert(errors.length === 0, 'no runtime errors on boot');
assert(doc.querySelectorAll('#nav a').length === 7, 'nav has 7 links');
assert(doc.querySelector('.hero-greet'), 'today view rendered');
assert(doc.querySelectorAll('.sign-btn').length === 12, '12 sign buttons');
assert(doc.querySelector('canvas[data-moon]'), 'moon canvas rendered');
assert(doc.querySelectorAll('.reading-card').length === 5, '5 daily reading cards');
assert(!doc.querySelector('.cal-day'), 'no calendar on today view (expected)');
console.log('  -- boot html length:', doc.querySelector('#app').innerHTML.length);

// --- sign switch ---
const taurusBtn = Array.from(doc.querySelectorAll('.sign-btn')).find((b) => b.dataset.sign === 'taurus');
taurusBtn.click();
assert(doc.querySelector('.sign-btn.active').dataset.sign === 'taurus', 'sign switch works');
assert(/Taurus/.test(doc.querySelector('.reading-card .r-text').parentElement.textContent), 'reading updates for Taurus');

// --- navigate every view ---
const views = ['you', 'match', 'life', 'moon', 'rituals', 'journal'];
for (const v of views) {
  window.location.hash = '#' + v;
  window.dispatchEvent(new window.Event('hashchange'));
  const active = doc.querySelector('#nav a.active');
  assert(active && active.dataset.view === v, 'view renders: ' + v);
  assert(doc.querySelector('#app').innerHTML.length > 400, 'view ' + v + ' has content');
}

// --- life tabs ---
window.location.hash = '#life';
window.dispatchEvent(new window.Event('hashchange'));
for (const tab of ['career', 'love', 'money', 'relocation', 'advice']) {
  const btn = doc.querySelector('[data-act="life-tab"][data-tab="' + tab + '"]');
  btn.click();
  assert(doc.querySelector('[data-act="life-tab"][data-tab="' + tab + '"].active'), 'life tab: ' + tab);
}

// --- relocation pick ---
const reloc = doc.querySelector('[data-act="dest-pick"]');
if (reloc) {
  const city = reloc.dataset.city;
  reloc.click();
  assert(doc.querySelector('[data-act="dest-pick"].active').dataset.city === city, 'relocation pick: ' + city);
}

// --- rituals tabs ---
window.location.hash = '#rituals';
window.dispatchEvent(new window.Event('hashchange'));
for (const tab of ['new', 'full', 'beauty', 'money', 'more']) {
  const btn = doc.querySelector('[data-act="ritual-tab"][data-tab="' + tab + '"]');
  btn.click();
  assert(doc.querySelector('[data-act="ritual-tab"][data-tab="' + tab + '"].active'), 'ritual tab: ' + tab);
}
assert(doc.querySelectorAll('.ritual').length >= 10, 'more-rituals grid renders cards');

// --- open a ritual modal ---
const viewRitual = doc.querySelector('[data-act="view-ritual"]');
if (viewRitual) {
  viewRitual.click();
  assert(!doc.querySelector('#modal').hidden, 'ritual modal opens');
  assert(doc.querySelector('#modalBody h2'), 'modal has title');
  doc.querySelector('.modal-x').click();
  assert(doc.querySelector('#modal').hidden, 'modal closes');
}

// --- journal flow ---
window.location.hash = '#journal';
window.dispatchEvent(new window.Event('hashchange'));
const jtext = doc.querySelector('#j-text');
jtext.value = 'Test entry from the smoke test.';
doc.querySelector('form[data-form="journal"]').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
assert(doc.querySelectorAll('.entry').length === 1, 'journal entry saved');
assert(/Test entry/.test(doc.querySelector('.entry-body').textContent), 'journal entry content correct');

// --- moon calendar interaction ---
window.location.hash = '#moon';
window.dispatchEvent(new window.Event('hashchange'));
const dayBtn = doc.querySelector('[data-act="pick-day"]');
if (dayBtn) {
  dayBtn.click();
  assert(doc.querySelector('.cal-day.selected'), 'calendar day selection');
}
const prev = doc.querySelector('[data-act="cal-prev"]');
const labelBefore = doc.querySelector('.cal-nav h4').textContent;
prev.click();
assert(doc.querySelector('.cal-nav h4').textContent !== labelBefore, 'calendar month navigation');

// --- profile flow ---
const chip = doc.querySelector('#profileChip');
chip.click();
assert(!doc.querySelector('#modal').hidden, 'profile modal opens');
const pform = doc.querySelector('form[data-form="profile"]');
pform.querySelector('[name="name"]').value = 'Luna';
pform.querySelector('[name="date"]').value = '1992-07-14';
pform.querySelector('[name="time"]').value = '06:30';
pform.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
assert(doc.querySelector('#chipText').textContent.indexOf('Luna') === 0, 'profile saved and chip updated');
assert(JSON.parse(window.localStorage.getItem('astraea.profile.v1')).name === 'Luna', 'profile persisted');

window.location.hash = '#you';
window.dispatchEvent(new window.Event('hashchange'));
assert(/Cancer/.test(doc.querySelector('#app').textContent), 'chart shows Cancer sun');
assert(doc.querySelector('svg'), 'chart wheel renders');

// --- match view with selects ---
window.location.hash = '#match';
window.dispatchEvent(new window.Event('hashchange'));
const sel = doc.querySelector('[data-act="matchA"]');
sel.value = 'leo';
sel.dispatchEvent(new window.Event('change', { bubbles: true }));
assert(doc.querySelector('[data-act="matchA"]').value === 'leo', 'match select change');
assert(doc.querySelector('.score-num'), 'match score renders');

console.log('\n' + (errors.length ? 'FAILURES:\n' + errors.join('\n') : 'ALL SMOKE TESTS PASSED'));
process.exit(errors.length ? 1 : 0);
