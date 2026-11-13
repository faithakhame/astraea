/* ============================================================
   ASTRAEA — application
   ============================================================ */
(function () {
  'use strict';

  const A = window.Astro;
  const Z = window.ZODIAC;
  const D = window.DAILY_DATA;
  const R = window.RITUAL_DATA;
  const SIGNS = Z.SIGNS;
  const ORDER = Z.ORDER;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ------------------------------------------------------------
     utilities
     ------------------------------------------------------------ */

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function hashStr(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Deterministic pick that also reports the chosen index.
  function pick(arr, seed) {
    const r = mulberry32(hashStr(seed))();
    const index = Math.floor(r * arr.length) % arr.length;
    return { item: arr[index], index: index };
  }

  function pickOne(arr, seed) {
    return pick(arr, seed).item;
  }

  function illumText(fraction) {
    const v = Math.round(fraction * 100);
    return v <= 0 ? '<1' : String(v);
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function isoDate(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function parseDay(iso) {
    const parts = String(iso).split('-').map(Number);
    return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1, 12, 0, 0);
  }

  function daysDiff(a, b) {
    return Math.round((parseDay(b) - parseDay(a)) / 86400000);
  }

  // Phase events are expensive to compute; cache them for the day.
  let eventsCache = { key: '', list: [] };
  function upcomingEvents() {
    const key = todayISO();
    if (eventsCache.key !== key) {
      eventsCache = { key: key, list: A.nextEvents(new Date(), 12) };
    }
    return eventsCache.list;
  }

  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return 'Still awake';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 22) return 'Good evening';
    return 'Late, and luminous';
  }

  const WEEKDAY_RULERS = [
    { planet: 'the Sun', note: 'a day for visibility, warmth and being seen' },
    { planet: 'the Moon', note: 'a day for feeling, home and intuition' },
    { planet: 'Mars', note: 'a day for action, courage and honest friction' },
    { planet: 'Mercury', note: 'a day for words, plans and quick thinking' },
    { planet: 'Jupiter', note: 'a day for expansion, luck and asking for more' },
    { planet: 'Venus', note: 'a day for beauty, pleasure and connection' },
    { planet: 'Saturn', note: 'a day for structure, boundaries and slow work' },
  ];

  function dayRuler(date) {
    return WEEKDAY_RULERS[date.getDay()];
  }

  /* ------------------------------------------------------------
     persistent state
     ------------------------------------------------------------ */

  const LS_PROFILE = 'astraea.profile.v1';
  const LS_JOURNAL = 'astraea.journal.v1';

  function readLS(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeLS(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* storage may be unavailable */ }
  }

  function todayISO() { return isoDate(new Date()); }

  const state = {
    profile: readLS(LS_PROFILE, null),
    journal: readLS(LS_JOURNAL, []),
    view: 'today',
    sign: 'aries',
    lifeTab: 'advice',
    ritualTab: 'new',
    matchA: 'aries',
    matchB: 'leo',
    destination: 'Lisbon',
    moonDate: todayISO(),
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth(),
  };

  function profileSky() {
    if (!state.profile || !state.profile.date) return null;
    try {
      const [y, m, d] = state.profile.date.split('-').map(Number);
      const time = (state.profile.time || '12:00').split(':').map(Number);
      const dt = new Date(y, m - 1, d, time[0] || 12, time[1] || 0, 0);
      const sky = A.birthSky(dt);
      sky.sunSign = A.signId(sky.sunLongitude);
      sky.dateObj = dt;
      return sky;
    } catch (e) {
      return null;
    }
  }

  function syncSignWithProfile() {
    const sky = profileSky();
    if (sky) state.sign = sky.sunSign;
  }

  syncSignWithProfile();
  if (!state.profile) state.sign = 'aries';

  /* ------------------------------------------------------------
     reading generation
     ------------------------------------------------------------ */

  function dailyRead(signId, dateStr) {
    const pools = D.DAILY[signId];
    const out = {};
    const keys = ['headline', 'love', 'career', 'money', 'wellbeing'];
    keys.forEach(function (key) {
      out[key] = pickOne(pools[key], signId + '|' + dateStr + '|' + key);
    });
    const rng = mulberry32(hashStr(signId + '|' + dateStr + '|scores'));
    out.scores = {};
    keys.forEach(function (key) {
      out.scores[key] = 3 + Math.floor(rng() * 3);
    });
    return out;
  }

  function flowBetween(skySign, moonSignId) {
    const a = SIGNS[skySign];
    const b = SIGNS[moonSignId];
    const aff = D.elementAffinity(a.element, b.element);
    const pct = Math.round(46 + aff * 52);
    let label, line;
    if (aff >= 0.9) {
      label = 'Flowing';
      line = 'The sky is speaking your language today. Trust the easy yes.';
    } else if (aff >= 0.7) {
      label = 'Supportive';
      line = 'Enough ease to make progress, enough difference to stay awake.';
    } else if (aff >= 0.5) {
      label = 'Stimulating';
      line = 'A useful friction. You will learn something if you do not dig in.';
    } else {
      label = 'Friction';
      line = 'The day asks for patience, not force. Move gently and name the feeling.';
    }
    return { pct: pct, label: label, line: line, aff: aff };
  }

  function dailyLucky(signId, dateStr) {
    const s = SIGNS[signId];
    const seed = signId + '|' + dateStr + '|lucky';
    const color = pickOne(s.colors, seed + '|c');
    const rng = mulberry32(hashStr(seed + '|n'));
    const number = 1 + Math.floor(rng() * 9);
    const hour = 7 + Math.floor(rng() * 12);
    const crystal = pickOne(s.crystals, seed + '|cr');
    const herb = pickOne(s.herbs, seed + '|h');
    return { color: color, number: (s.luckyNumber + number) % 9 || 9, hour: hour, crystal: crystal, herb: herb };
  }

  /* ------------------------------------------------------------
     compatibility
     ------------------------------------------------------------ */

  function pairText(aEl, bEl) {
    return D.ELEMENT_PAIRS[aEl + '-' + bEl] || D.ELEMENT_PAIRS[bEl + '-' + aEl] || {
      spark: 'Two different weathers learning to share a room.',
      friction: 'The differences are real, and they are the point.',
      advice: 'Say what you need before you decide they should already know.',
    };
  }

  function compatibility(aId, bId) {
    const a = SIGNS[aId];
    const b = SIGNS[bId];
    const eAff = D.elementAffinity(a.element, b.element);
    const ia = ORDER.indexOf(aId);
    const ib = ORDER.indexOf(bId);
    const opposite = Math.abs(ia - ib) === 6;
    const sameMod = a.modality === b.modality;
    const mAff = sameMod ? (a.modality === 'Fixed' ? 0.64 : 0.8) : 0.72;
    const hasAir = a.element === 'Air' || b.element === 'Air';
    const hasEarth = a.element === 'Earth' || b.element === 'Earth';
    const hasFire = a.element === 'Fire' || b.element === 'Fire';
    const hasWater = a.element === 'Water' || b.element === 'Water';
    const has = function (v) { return v ? 1 : 0.5; };
    const clamp01 = function (v) { return Math.max(0.32, Math.min(0.99, v)); };

    const metrics = {
      attraction: clamp01(0.30 + 0.40 * eAff + 0.16 * (opposite ? 1 : 0) + 0.10 * has(hasFire || hasWater)),
      communication: clamp01(0.32 + 0.36 * eAff + 0.20 * has(hasAir) + 0.10 * has(sameMod)),
      stability: clamp01(0.28 + 0.34 * mAff + 0.24 * has(hasEarth) + 0.12 * has(sameMod)),
      passion: clamp01(0.30 + 0.34 * has(hasFire) + 0.24 * has(hasWater) + 0.14 * eAff),
      growth: clamp01(0.36 + 0.30 * has(a.element !== b.element) + 0.20 * mAff + 0.12 * (opposite ? 1 : 0)),
    };

    const weights = { attraction: 1.15, communication: 1.0, stability: 1.0, passion: 1.0, growth: 0.95 };
    let total = 0;
    let weightSum = 0;
    Object.keys(metrics).forEach(function (k) {
      total += metrics[k] * weights[k];
      weightSum += weights[k];
    });
    const score = Math.round((total / weightSum) * 100);

    let label = D.MATCH_LABELS.edge;
    ['twin', 'magnetic', 'slow', 'work', 'edge'].some(function (key) {
      if (score >= D.MATCH_LABELS[key].min) { label = D.MATCH_LABELS[key]; return true; }
      return false;
    });

    return {
      a: a, b: b, score: score, metrics: metrics, label: label,
      opposite: opposite, pair: pairText(a.element, b.element),
      eAff: eAff, sameMod: sameMod,
    };
  }

  /* ------------------------------------------------------------
     moon drawing
     ------------------------------------------------------------ */

  const CRATERS = [
    { x: -0.34, y: -0.28, r: 0.16, a: 0.10 },
    { x: 0.22, y: -0.42, r: 0.09, a: 0.09 },
    { x: 0.36, y: 0.12, r: 0.13, a: 0.08 },
    { x: -0.12, y: 0.34, r: 0.20, a: 0.07 },
    { x: 0.05, y: 0.02, r: 0.26, a: 0.05 },
    { x: -0.52, y: 0.12, r: 0.08, a: 0.09 },
    { x: 0.14, y: 0.55, r: 0.07, a: 0.08 },
    { x: 0.55, y: -0.24, r: 0.05, a: 0.10 },
  ];

  function drawMoon(canvas, fraction, waxing) {
    const rect = canvas.getBoundingClientRect();
    const size = Math.max(rect.width || canvas.parentElement.clientWidth || 220, 80);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - size * 0.05;
    const f = Math.max(0, Math.min(1, Number(fraction) || 0));

    // soft halo
    const halo = ctx.createRadialGradient(cx, cy, r * 0.85, cx, cy, r * 1.35);
    halo.addColorStop(0, 'rgba(236, 214, 166, 0.20)');
    halo.addColorStop(0.55, 'rgba(236, 214, 166, 0.06)');
    halo.addColorStop(1, 'rgba(236, 214, 166, 0)');
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.35, 0, Math.PI * 2);
    ctx.fillStyle = halo;
    ctx.fill();

    // disc
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    const base = ctx.createRadialGradient(cx - r * 0.38, cy - r * 0.42, r * 0.08, cx, cy, r);
    base.addColorStop(0, '#fffdf3');
    base.addColorStop(0.48, '#f4ead4');
    base.addColorStop(0.82, '#e2d2ae');
    base.addColorStop(1, '#c2ad83');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = base;
    ctx.fill();

    // craters
    CRATERS.forEach(function (c) {
      const g = ctx.createRadialGradient(
        cx + c.x * r - c.r * r * 0.25, cy + c.y * r - c.r * r * 0.25, 0,
        cx + c.x * r, cy + c.y * r, c.r * r
      );
      g.addColorStop(0, 'rgba(120, 104, 74, ' + (c.a * 0.55) + ')');
      g.addColorStop(0.75, 'rgba(140, 122, 88, ' + c.a + ')');
      g.addColorStop(1, 'rgba(255, 250, 235, 0)');
      ctx.beginPath();
      ctx.arc(cx + c.x * r, cy + c.y * r, c.r * r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    });

    // dark side
    const d = 2 * f - 1;
    const A_axis = (waxing ? -d : d) * r;
    const absA = Math.abs(A_axis);
    const anticlockwise = A_axis >= 0;

    ctx.beginPath();
    if (waxing) {
      ctx.moveTo(cx, cy - r);
      ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, true);
    } else {
      ctx.moveTo(cx, cy - r);
      ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
    }
    ctx.ellipse(cx, cy, Math.max(absA, 0.001), r, 0, Math.PI / 2, -Math.PI / 2, anticlockwise);
    ctx.closePath();
    ctx.fillStyle = 'rgba(10, 8, 20, 0.9)';
    ctx.fill();

    // earthshine: keep the unlit disc faintly visible so a new moon still reads as a moon
    if (f < 0.97) {
      const shade = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.08, cx, cy, r * 1.02);
      shade.addColorStop(0, 'rgba(150, 146, 205, 0.16)');
      shade.addColorStop(0.62, 'rgba(92, 86, 140, 0.09)');
      shade.addColorStop(1, 'rgba(255, 238, 198, 0.10)');
      ctx.fillStyle = shade;
      ctx.fill();
    }
    ctx.restore();

    // rim light
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 245, 220, 0.22)';
    ctx.lineWidth = Math.max(0.8, size * 0.004);
    ctx.stroke();
  }

  function hydrateMoons(root) {
    $$('canvas[data-moon]', root || document).forEach(function (canvas) {
      drawMoon(canvas, canvas.dataset.fraction, canvas.dataset.waxing === 'true');
    });
  }

  /* ------------------------------------------------------------
     shared components
     ------------------------------------------------------------ */

  function dots(n) {
    let out = '<span class="dots">';
    for (let i = 1; i <= 5; i++) out += '<i class="' + (i <= n ? 'on' : '') + '"></i>';
    return out + '</span>';
  }

  function meter(label, value) {
    return '<div class="meter"><div class="meter-top"><span>' + esc(label) + '</span><b>' + value + '%</b></div>' +
      '<div class="meter-track"><div class="meter-fill" style="width:' + value + '%"></div></div></div>';
  }

  function scoreRing(score, word) {
    const r = 44;
    const c = 2 * Math.PI * r;
    const off = c * (1 - Math.max(0, Math.min(100, score)) / 100);
    return '<div class="score-ring">' +
      '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<defs><linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#9b7cf6"/><stop offset="100%" stop-color="#ecd6a6"/>' +
      '</linearGradient></defs>' +
      '<circle class="ring-bg" cx="50" cy="50" r="' + r + '"/>' +
      '<circle class="ring-fg" cx="50" cy="50" r="' + r + '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
      '</svg>' +
      '<div class="score-inner"><div class="score-num">' + score + '<small>%</small></div>' +
      '<div class="score-word">' + esc(word) + '</div></div></div>';
  }

  function signStripHTML() {
    return '<div class="sign-strip">' + ORDER.map(function (id) {
      const s = SIGNS[id];
      return '<button type="button" class="sign-btn ' + (state.sign === id ? 'active' : '') + '" data-act="sign" data-sign="' + id + '" aria-pressed="' + (state.sign === id) + '">' +
        '<span class="glyph">' + s.symbol + '</span><span class="nm">' + s.name + '</span></button>';
    }).join('') + '</div>';
  }

  function signSelectHTML(name, value, act) {
    return '<select class="select" data-act="' + act + '" aria-label="' + esc(name) + '">' +
      ORDER.map(function (id) {
        return '<option value="' + id + '"' + (value === id ? ' selected' : '') + '>' + SIGNS[id].symbol + '  ' + SIGNS[id].name + '</option>';
      }).join('') + '</select>';
  }

  function pageHead(eyebrow, title, sub) {
    return '<div class="page-head"><div class="eyebrow">' + esc(eyebrow) + '</div>' +
      '<h1 class="page-title">' + title + '</h1>' +
      (sub ? '<p class="page-sub">' + sub + '</p>' : '') + '</div>';
  }

  /* ------------------------------------------------------------
     VIEW — today
     ------------------------------------------------------------ */

  function viewToday() {
    const now = new Date();
    const jd = A.toJD(now);
    const phase = A.phaseInfo(jd);
    const moonLon = A.moonLongitude(jd);
    const moonSignId = A.signId(moonLon);
    const weather = D.MOON_WEATHER[moonSignId];
    const sign = SIGNS[state.sign];
    const read = dailyRead(state.sign, isoDate(now));
    const lucky = dailyLucky(state.sign, isoDate(now));
    const guidance = R.PHASE_GUIDANCE[phase.id];
    const ruler = dayRuler(now);
    const nextEvent = upcomingEvents()[0];
    const sky = profileSky();
    const baseSign = sky ? sky.sunSign : state.sign;
    const flow = flowBetween(baseSign, moonSignId);
    const flowWord = { Flowing: 'in flow with it', Supportive: 'supported by it', Stimulating: 'stimulated by it', Friction: 'in friction with it' }[flow.label] || 'moving with it';
    const affirmation = pickOne(D.AFFIRMATIONS, isoDate(now) + '|affirm');
    const name = state.profile && state.profile.name ? esc(state.profile.name) : 'stargazer';
    const ill = illumText(phase.illumination);

    const chips = [
      '<span class="pill gold"><span class="dot"></span>' + phase.glyph + ' ' + phase.name + '</span>',
      '<span class="pill">Moon in ' + SIGNS[moonSignId].name + ' ' + SIGNS[moonSignId].symbol + '</span>',
      '<span class="pill">' + ruler.planet + ' day</span>',
      '<span class="pill">' + ill + '% illuminated</span>',
    ].join('');

    const cards = [
      { key: 'headline', name: 'Energy', icon: '✦', wide: true },
      { key: 'love', name: 'Love', icon: '♡' },
      { key: 'career', name: 'Career', icon: '⚜' },
      { key: 'money', name: 'Money', icon: '◈' },
      { key: 'wellbeing', name: 'Wellbeing', icon: '✧' },
    ];

    const readingHTML = cards.map(function (c) {
      return '<article class="card reading-card reveal" style="' + (c.wide ? 'grid-column:1/-1;' : '') + '">' +
        '<div class="r-top"><span class="r-icon">' + c.icon + '</span>' +
        '<span class="r-name">' + c.name + ' · ' + sign.name + '</span>' +
        dots(read.scores[c.key]) + '</div>' +
        '<p class="r-text">' + esc(read[c.key]) + '</p></article>';
    }).join('');

    return '<section class="view">' +
      '<div class="hero">' +
        '<div class="hero-copy">' +
          '<div class="eyebrow">' + esc(A.formatDate(now)) + '</div>' +
          '<h1 class="hero-greet">' + greeting() + ', <em>' + name + '</em>.</h1>' +
          '<p class="page-sub">The Moon is ' + ill + '% lit in ' + SIGNS[moonSignId].name + ', and ' +
            (sky ? 'your ' + SIGNS[baseSign].name + ' sun is ' + flowWord : 'the day has a ' + flow.label.toLowerCase() + ' quality') +
            '. ' + esc(flow.line) + '</p>' +
          '<div class="hero-meta">' + chips + '</div>' +
          '<div class="btn-row">' +
            '<a class="btn" href="#you">' + (state.profile ? 'Open your chart' : 'Set your birth sky') + '</a>' +
            '<button class="btn ghost" type="button" data-act="journal-new">Write it down</button>' +
          '</div>' +
        '</div>' +
        '<div class="moon-stage">' +
          '<canvas class="moon-canvas" data-moon data-fraction="' + phase.illumination + '" data-waxing="' + phase.waxing + '" role="img" aria-label="' + esc(phase.name) + '"></canvas>' +
          '<div class="moon-caption"><div class="phase-name">' + phase.name + '</div>' +
          '<div class="phase-sub">' + ill + '% · ' + (phase.waxing ? 'waxing' : 'waning') + '</div></div>' +
        '</div>' +
      '</div>' +

      '<div class="section-head"><div><div class="eyebrow">Tune the reading</div>' +
        '<h2 class="section-title">Choose a sign</h2></div>' +
        '<p class="section-sub">' + (state.profile ? 'Set to your sun by default. Change it to read for someone else — or for your moon, your rising, or the person you cannot stop thinking about.' : 'No birth details needed. Pick a sign to begin.') + '</p></div>' +
      signStripHTML() +

      '<div class="grid grid-2 mt-3">' +
        '<div class="card gold reveal">' +
          '<div class="card-label">Cosmic weather</div>' +
          '<h3 class="card-title">' + esc(weather.title) + '</h3>' +
          '<p class="card-body mb-0">' + esc(weather.mood) + '</p>' +
          '<hr class="divider" />' +
          '<div class="grid grid-2" style="gap:16px">' +
            '<div><div class="card-label">Lean in</div><ul class="list-clean">' +
              weather.do.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
            '<div><div class="card-label">Leave it</div><ul class="list-clean">' +
              weather.dont.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
          '</div>' +
          '<p class="small mt-2 mb-0">' + esc(weather.note) + '</p>' +
        '</div>' +

        '<div class="card reveal">' +
          '<div class="card-label">Your season</div>' +
          '<h3 class="card-title">' + (sky ? esc(SIGNS[baseSign].name) + ' sun, Moon in ' + esc(SIGNS[moonSignId].name) : 'Reading for ' + esc(sign.name)) + '</h3>' +
          meter(flow.label + ' with the sky', flow.pct) +
          '<p class="card-body">' + esc(flow.line) + '</p>' +
          '<hr class="divider" />' +
          '<div class="card-label">Today’s ruler · ' + esc(ruler.planet) + '</div>' +
          '<p class="card-body">' + esc(ruler.note.charAt(0).toUpperCase() + ruler.note.slice(1)) + '.</p>' +
          (nextEvent ? '<a class="tiny" href="#moon" style="display:inline-flex;align-items:center;gap:6px;color:var(--gold-soft)">' +
            'Next sky event: ' + nextEvent.glyph + ' ' + esc(nextEvent.name) + ' in ' + esc(SIGNS[nextEvent.sign].name) + ' · ' +
            esc(nextEvent.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })) + ' →</a>' : '') +
          (sky ? '' : '<div class="mt-2"><a class="btn ghost small" href="#you">Set your birth sky →</a></div>') +
        '</div>' +
      '</div>' +

      '<div class="section-head"><div><div class="eyebrow">The daily reading</div>' +
        '<h2 class="section-title">' + esc(sign.name) + ', today</h2></div>' +
        '<p class="section-sub">' + esc(sign.tagline) + '</p></div>' +
      '<div class="reading">' + readingHTML + '</div>' +

      '<div class="grid grid-2 mt-3">' +
        '<div class="card reveal">' +
          '<div class="card-label">Lucky details</div>' +
          '<div class="kv">' +
            '<div class="kv-row"><span>Colour</span><span style="display:inline-flex;align-items:center;gap:8px">' +
              '<i class="swatch" style="width:16px;height:16px;background:' + lucky.color.hex + ';display:inline-block"></i>' + esc(lucky.color.name) + '</span></div>' +
            '<div class="kv-row"><span>Number</span><span>' + lucky.number + '</span></div>' +
            '<div class="kv-row"><span>Best hour</span><span>' + lucky.hour + ':00 – ' + (lucky.hour + 1) + ':00</span></div>' +
            '<div class="kv-row"><span>Crystal</span><span>' + esc(lucky.crystal) + '</span></div>' +
            '<div class="kv-row"><span>Herb</span><span>' + esc(lucky.herb) + '</span></div>' +
            '<div class="kv-row"><span>Day ruler</span><span>' + esc(ruler.planet) + '</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="card reveal">' +
          '<div class="card-label">' + phase.name + ' · ' + esc(guidance.title) + '</div>' +
          '<h3 class="card-title">' + esc(guidance.focus) + '</h3>' +
          '<p class="card-body">' + esc(guidance.do) + '</p>' +
          '<div class="callout">' + esc(guidance.prompt) + '</div>' +
          '<a class="btn ghost small" href="#rituals">Rituals for this moon →</a>' +
        '</div>' +
      '</div>' +

      '<div class="quote-band reveal mt-3">' +
        '<blockquote>“' + esc(affirmation) + '”</blockquote>' +
        '<cite>Affirmation for ' + esc(A.formatDate(now, { month: 'long', day: 'numeric' })) + '</cite>' +
      '</div>' +
    '</section>';
  }

  /* ------------------------------------------------------------
     VIEW — your chart
     ------------------------------------------------------------ */

  function profileFormHTML(prefill, inModal) {
    const p = prefill || {};
    return '<form data-form="profile" class="grid" style="gap:16px"' + (inModal ? ' data-modal="1"' : '') + '>' +
      '<div class="field"><label for="pf-name">Name</label>' +
      '<input class="input" id="pf-name" name="name" type="text" placeholder="What should the sky call you?" value="' + esc(p.name || '') + '" autocomplete="name" /></div>' +
      '<div class="grid grid-2" style="gap:12px">' +
        '<div class="field"><label for="pf-date">Birth date</label>' +
        '<input class="input" id="pf-date" name="date" type="date" required value="' + esc(p.date || '') + '" /></div>' +
        '<div class="field"><label for="pf-time">Birth time <span class="tiny">(optional)</span></label>' +
        '<input class="input" id="pf-time" name="time" type="time" value="' + esc(p.time || '') + '" /></div>' +
      '</div>' +
      '<p class="tiny mb-0">Your details stay in this browser. They are used only to calculate your sun sign, natal moon and birth phase.</p>' +
      '<div class="btn-row"><button class="btn" type="submit">' + (p.date ? 'Update my sky' : 'Read my sky') + '</button>' +
        (p.date ? '<button class="btn ghost" type="button" data-act="clear-profile">Clear</button>' : '') +
      '</div>' +
    '</form>';
  }

  function chartWheelHTML(sky) {
    const cx = 170;
    const cy = 170;
    const rOuter = 150;
    const rInner = 112;
    const rGlyph = 132;
    const rMark = 88;

    function polar(lon, radius) {
      const t = (lon * Math.PI) / 180;
      return [cx - radius * Math.cos(t), cy + radius * Math.sin(t)];
    }

    let svg = '<svg viewBox="0 0 340 340" width="100%" style="max-width:360px;margin-inline:auto" role="img" aria-label="Sun and Moon placement wheel">';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + rOuter + '" fill="none" stroke="rgba(217,178,106,0.30)" stroke-width="1"/>';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + rInner + '" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="1"/>';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + rOuter * 0.72 + '" fill="none" stroke="rgba(155,124,246,0.14)" stroke-width="1" stroke-dasharray="2 5"/>';

    for (let i = 0; i < 12; i++) {
      const lon = i * 30;
      const p1 = polar(lon, rInner);
      const p2 = polar(lon, rOuter);
      svg += '<line x1="' + p1[0].toFixed(1) + '" y1="' + p1[1].toFixed(1) + '" x2="' + p2[0].toFixed(1) + '" y2="' + p2[1].toFixed(1) + '" stroke="rgba(255,255,255,0.10)" stroke-width="1"/>';
      const gp = polar(lon + 15, rGlyph);
      svg += '<text x="' + gp[0].toFixed(1) + '" y="' + (gp[1] + 5).toFixed(1) + '" text-anchor="middle" font-size="18" fill="#ecd6a6" opacity="0.85">' + SIGNS[ORDER[i]].symbol + '</text>';
    }

    const sunPoint = polar(sky.sunLongitude, rMark);
    const moonPoint = polar(sky.moonLongitude, rMark);
    svg += '<circle cx="' + sunPoint[0].toFixed(1) + '" cy="' + sunPoint[1].toFixed(1) + '" r="14" fill="rgba(217,178,106,0.16)" stroke="rgba(217,178,106,0.6)" stroke-width="1"/>';
    svg += '<text x="' + sunPoint[0].toFixed(1) + '" y="' + (sunPoint[1] + 5).toFixed(1) + '" text-anchor="middle" font-size="15" fill="#f6e7c6">☉</text>';
    svg += '<circle cx="' + moonPoint[0].toFixed(1) + '" cy="' + moonPoint[1].toFixed(1) + '" r="14" fill="rgba(155,124,246,0.18)" stroke="rgba(155,124,246,0.65)" stroke-width="1"/>';
    svg += '<text x="' + moonPoint[0].toFixed(1) + '" y="' + (moonPoint[1] + 5).toFixed(1) + '" text-anchor="middle" font-size="15" fill="#e6dbff">☾</text>';

    svg += '<text x="' + cx + '" y="' + (cy - 6) + '" text-anchor="middle" font-size="10" letter-spacing="3" fill="rgba(169,159,194,0.9)">SUN</text>';
    svg += '<text x="' + cx + '" y="' + (cy + 10) + '" text-anchor="middle" font-size="10" letter-spacing="3" fill="rgba(169,159,194,0.9)">MOON</text>';
    svg += '<text x="' + cx + '" y="' + (cy + 30) + '" text-anchor="middle" font-size="8" letter-spacing="2" fill="rgba(127,117,153,0.9)">BIRTH SKY</text>';
    return svg + '</svg>';
  }

  function viewYou() {
    const sky = profileSky();

    if (!sky) {
      return '<section class="view">' +
        pageHead('Your chart', 'Your birth sky', 'Two placements, one phase, and a surprisingly specific read on who you are when nobody is asking you to be anyone.') +
        '<div class="grid grid-2" style="align-items:start">' +
          '<div class="card gold"><div class="card-label">Enter your details</div><h2 class="card-title">Begin with the day you arrived</h2>' +
            '<p class="card-body">We calculate your sun sign, the sign the Moon was in, and the lunar phase you were born under. All of it happens locally — nothing is sent anywhere.</p>' +
            '<div class="mt-2">' + profileFormHTML(null) + '</div></div>' +
          '<div class="grid" style="gap:18px">' +
            '<div class="card"><div class="card-label">Sun · who you are becoming</div><p class="card-body mb-0">Your sun sign is the engine: the thing you are here to learn to be, loudly, even when it is inconvenient.</p></div>' +
            '<div class="card"><div class="card-label">Moon · what you need</div><p class="card-body mb-0">The moon is the private weather. It is what soothes you, what you reach for when no one is watching, and what you are actually asking for when you say you are fine.</p></div>' +
            '<div class="card"><div class="card-label">Phase · why you feel like this</div><p class="card-body mb-0">The lunar phase at your birth describes the kind of life you are built to live — beginning, building, revealing, or releasing.</p></div>' +
          '</div>' +
        '</div>' +
      '</section>';
    }

    const sun = SIGNS[sky.sunSign];
    const moon = SIGNS[sky.moonSign];
    const birthPhase = D.BIRTH_PHASES[sky.phase.id];
    const now = new Date();
    const transitMoon = A.signId(A.moonLongitude(A.toJD(now)));
    const flow = flowBetween(sky.sunSign, transitMoon);

    const elementWeights = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
    elementWeights[sun.element] += 2;
    elementWeights[moon.element] += 1;
    const totalW = 3;
    const elementsHTML = Object.keys(elementWeights).map(function (el) {
      const pct = Math.round((elementWeights[el] / totalW) * 100);
      return meter(el + ' · ' + Z.ELEMENTS[el].gift, pct);
    }).join('');

    return '<section class="view">' +
      pageHead('Your chart', 'Your birth sky', 'Sun, Moon and the phase you arrived under. A poetic chart — accurate on the astronomy, honest about the interpretation.') +
      '<div class="card gold">' +
        '<div class="sign-hero">' +
          '<div class="sign-sigil">' + sun.symbol + '</div>' +
          '<div><div class="card-label">Your sun</div><h2 class="sign-name">' + esc(sun.name) + '</h2>' +
            '<div class="sign-dates">' + esc(sun.dates) + ' · ' + esc(sun.element) + ' · ' + esc(sun.modality) + '</div></div>' +
          '<div class="sign-tag">' + esc(sun.tagline) + '</div>' +
        '</div>' +
        '<hr class="divider" />' +
        '<p class="prose lead mb-0">' + esc(sun.advice) + '</p>' +
        '<div class="btn-row mt-2"><button class="btn ghost small" type="button" data-act="open-profile">Edit birth details</button>' +
          '<a class="btn ghost small" href="#life">Explore your life paths →</a></div>' +
      '</div>' +

      '<div class="grid grid-3 mt-3">' +
        '<div class="card"><div class="card-label">Sun sign</div><h3 class="card-title">' + sun.symbol + ' ' + esc(sun.name) + '</h3>' +
          '<p class="card-body">' + esc(sun.strengths[0]) + '. ' + esc(sun.strengths[1]) + '.</p>' +
          '<div class="traits mt-2">' + sun.keywords.map(function (k) { return '<span class="tag gold">' + esc(k) + '</span>'; }).join('') + '</div></div>' +
        '<div class="card"><div class="card-label">Natal moon</div><h3 class="card-title">' + moon.symbol + ' Moon in ' + esc(moon.name) + '</h3>' +
          '<p class="card-body">Your private weather: ' + moon.keywords.slice(0, 3).map(function (k) { return esc(k.toLowerCase()); }).join(', ') + '. ' + esc(moon.beautyVibe) + '</p>' +
          '<p class="small mb-0">' + esc(sky.moonDegree) + ' ' + esc(moon.name) + '</p></div>' +
        '<div class="card"><div class="card-label">Birth phase</div><h3 class="card-title">' + sky.phase.glyph + ' ' + esc(birthPhase.archetype) + '</h3>' +
          '<p class="card-body">' + esc(birthPhase.gift) + ' — your gift. Lesson: ' + esc(birthPhase.lesson) + '</p>' +
          '<p class="small mb-0">' + esc(birthPhase.name) + ' · ' + Math.round(sky.phase.illumination * 100) + '% lit</p></div>' +
      '</div>' +

      '<div class="grid grid-2 mt-3" style="align-items:start">' +
        '<div class="card"><div class="card-label">The wheel</div>' + chartWheelHTML(sky) +
          '<p class="tiny center mt-2 mb-0">Sun at ' + esc(A.formatDegree(sky.sunLongitude)) + ' ' + esc(sun.name) + ' · Moon at ' + esc(sky.moonDegree) + ' ' + esc(moon.name) + '</p></div>' +
        '<div class="grid" style="gap:18px">' +
          '<div class="card"><div class="card-label">Elemental emphasis</div>' + elementsHTML +
            '<p class="small mt-2 mb-0">' + esc(Z.ELEMENTS[sun.element].line) + '</p></div>' +
          '<div class="card"><div class="card-label">Your birth phase</div>' +
            '<p class="card-body">' + esc(birthPhase.text) + '</p>' +
            '<div class="callout mb-0">' + esc(birthPhase.lesson) + '</div></div>' +
        '</div>' +
      '</div>' +

      '<div class="card mt-3">' +
        '<div class="card-label">Right now</div>' +
        '<div class="grid grid-2" style="gap:24px;align-items:center">' +
          '<div><h3 class="card-title">Moon in ' + esc(SIGNS[transitMoon].name) + ' · ' + flow.label + '</h3>' +
            meter('Transit flow', flow.pct) +
            '<p class="card-body mb-0">' + esc(flow.line) + '</p></div>' +
          '<div><div class="card-label">What to lean into</div>' +
            '<ul class="list-clean">' + D.MOON_WEATHER[transitMoon].do.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
            '<a class="btn ghost small mt-2" href="#moon">Follow the moon →</a></div>' +
        '</div>' +
      '</div>' +

      '<div class="quote-band mt-3"><blockquote>“' + esc(sun.mantra) + '”</blockquote><cite>' + esc(sun.name) + ' mantra</cite></div>' +
    '</section>';
  }

  /* ------------------------------------------------------------
     VIEW — compatibility
     ------------------------------------------------------------ */

  function viewMatch() {
    const m = compatibility(state.matchA, state.matchB);
    const a = m.a;
    const b = m.b;
    const metrics = [
      ['Attraction', m.metrics.attraction],
      ['Communication', m.metrics.communication],
      ['Stability', m.metrics.stability],
      ['Passion', m.metrics.passion],
      ['Growth', m.metrics.growth],
    ];

    const skyNow = profileSky();
    const myBase = skyNow ? skyNow.sunSign : state.matchA;
    const ranked = ORDER.map(function (id) {
      return { id: id, score: compatibility(myBase, id).score };
    }).sort(function (x, y) { return y.score - x.score; }).slice(0, 5);

    return '<section class="view">' +
      pageHead('Compatibility', 'Two skies, one weather', 'Not a verdict. A map of where the ease is, where the work is, and why you keep coming back.') +
      '<div class="card">' +
        '<div class="match-grid">' +
          '<div class="match-pick"><div class="mp-glyph">' + a.symbol + '</div>' +
            '<div class="field"><label>Person A</label>' + signSelectHTML('Person A', state.matchA, 'matchA') + '</div></div>' +
          '<div class="match-pick"><div class="mp-glyph">' + b.symbol + '</div>' +
            '<div class="field"><label>Person B</label>' + signSelectHTML('Person B', state.matchB, 'matchB') + '</div></div>' +
        '</div>' +
        '<div class="btn-row mt-2"><button class="btn ghost small" type="button" data-act="swap-match">⇄ Swap</button>' +
          '<button class="btn ghost small" type="button" data-act="surprise-match">Surprise me</button>' +
          '<span class="small">' + esc(a.element) + ' ' + esc(a.modality) + ' × ' + esc(b.element) + ' ' + esc(b.modality) + '</span></div>' +
      '</div>' +

      '<div class="grid grid-2 mt-3" style="align-items:stretch">' +
        '<div class="card gold center">' +
          '<div class="heart-orbit"><span class="glyph-lg">' + a.symbol + '</span><span class="amp">×</span><span class="glyph-lg">' + b.symbol + '</span></div>' +
          scoreRing(m.score, m.label.label) +
          '<p class="card-body mt-2 mb-0">' + esc(m.label.desc) + '</p>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-label">The breakdown</div>' +
          metrics.map(function (row) { return meter(row[0], Math.round(row[1] * 100)); }).join('') +
          '<p class="tiny mb-0">' + (m.opposite ? 'Opposite signs: maximum mirroring, maximum projection. You see yourself in them whether you like it or not.' : 'Element affinity: ' + Math.round(m.eAff * 100) + '/100 · ' + (m.sameMod ? 'same modality — you move at the same tempo' : 'different modalities — one starts, one sustains, one adapts')) + '</p>' +
        '</div>' +
      '</div>' +

      '<div class="grid grid-2 mt-3" style="align-items:start">' +
        '<div class="card"><div class="card-label">The spark</div>' +
          '<h3 class="card-title">' + esc(a.name) + ' + ' + esc(b.name) + '</h3>' +
          '<p class="card-body">' + esc(m.pair.spark) + '</p>' +
          '<hr class="divider" />' +
          '<div class="card-label">The friction</div>' +
          '<p class="card-body mb-0">' + esc(m.pair.friction) + '</p></div>' +
        '<div class="card"><div class="card-label">How to love them</div>' +
          '<div class="kv">' +
            '<div class="kv-row"><span>' + esc(a.name) + ' needs</span><span>' + esc(a.keywords[0]) + ' &amp; ' + esc(a.keywords[2].toLowerCase()) + '</span></div>' +
            '<div class="kv-row"><span>' + esc(b.name) + ' needs</span><span>' + esc(b.keywords[0]) + ' &amp; ' + esc(b.keywords[2].toLowerCase()) + '</span></div>' +
            '<div class="kv-row"><span>Shared rhythm</span><span>' + (m.sameMod ? 'Same tempo' : a.modality + ' + ' + b.modality) + '</span></div>' +
            '<div class="kv-row"><span>Element</span><span>' + esc(a.element) + ' + ' + esc(b.element) + '</span></div>' +
          '</div>' +
          '<div class="callout mt-2">' + esc(m.pair.advice) + '</div></div>' +
      '</div>' +

      '<div class="card mt-3"><div class="card-label">Best matches for ' + esc(SIGNS[myBase].name) + '</div>' +
        '<div class="grid grid-3 mt-2" style="gap:12px">' +
          ranked.map(function (r) {
            const s = SIGNS[r.id];
            return '<button type="button" class="dest" data-act="pick-match" data-sign="' + r.id + '">' +
              '<span class="d-flag" style="color:var(--gold-soft)">' + s.symbol + '</span>' +
              '<span><span class="d-name">' + esc(s.name) + '</span><br /><span class="d-region">' + esc(s.element) + ' · ' + esc(s.modality) + '</span></span>' +
              '<span class="d-score">' + r.score + '</span></button>';
          }).join('') +
        '</div>' +
        '<p class="tiny mt-2 mb-0">Scores are a poetic blend of element, modality and polarity — a starting point for a conversation, not a substitute for one.</p></div>' +
    '</section>';
  }

  /* ------------------------------------------------------------
     VIEW — life paths
     ------------------------------------------------------------ */

  const LIFE_TABS = [
    { id: 'advice', label: 'Advice' },
    { id: 'career', label: 'Career' },
    { id: 'love', label: 'Love life' },
    { id: 'money', label: 'Money' },
    { id: 'relocation', label: 'Relocation' },
  ];

  function relocationScore(sign, dest) {
    const aff = D.elementAffinity(sign.element, dest.element);
    const jitter = (hashStr(sign.id + dest.city) % 1000) / 1000;
    return Math.round(50 + aff * 34 + jitter * 15);
  }

  function relocateRitual(dest) {
    return 'Before you go, write the version of yourself you are leaving behind and put it somewhere safe. On arrival, take one walk with no map, buy one thing from a local maker, and say out loud: “I live here now.” ' + dest.city + ' will answer in its own language — give it a week before you decide what it said.';
  }

  function viewLife() {
    const s = SIGNS[state.sign];
    const tab = state.lifeTab;
    const now = new Date();
    const transitMoon = A.signId(A.moonLongitude(A.toJD(now)));
    const flow = flowBetween(state.sign, transitMoon);
    const read = dailyRead(state.sign, isoDate(now));

    let body = '';

    if (tab === 'advice') {
      body = '<div class="grid grid-2" style="align-items:start">' +
        '<div class="card gold prose"><div class="card-label">The guidance</div>' +
          '<p class="lead">' + esc(s.advice) + '</p>' +
          '<div class="callout">' + esc(s.mantra) + '</div>' +
          '<div class="card-label mt-2">Today’s nudge</div>' +
          '<p class="mb-0">' + esc(read.headline) + '</p></div>' +
        '<div class="grid" style="gap:18px">' +
          '<div class="card"><div class="card-label">What you are good at</div><ul class="list-clean">' +
            s.strengths.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
          '<div class="card"><div class="card-label">What to watch</div><ul class="list-clean">' +
            s.shadow.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
          '<div class="card"><div class="card-label">Your element</div>' +
            '<h3 class="card-title">' + esc(s.element) + ' · ' + esc(s.modality) + '</h3>' +
            '<p class="card-body">' + esc(Z.ELEMENTS[s.element].line) + '</p>' +
            '<p class="small mb-0">' + esc(Z.MODALITIES[s.modality].line) + '</p></div>' +
        '</div></div>';
    }

    if (tab === 'career') {
      body = '<div class="grid grid-2" style="align-items:start">' +
        '<div class="card gold prose"><div class="card-label">Career development</div>' +
          '<p class="lead">' + esc(s.career) + '</p>' +
          '<div class="callout">' + esc(read.career) + '</div>' +
          '<div class="btn-row"><a class="btn ghost small" href="#rituals">Career ritual →</a>' +
          '<button class="btn ghost small" type="button" data-act="journal-new" data-prefill="Career move: ">Make a note</button></div></div>' +
        '<div class="grid" style="gap:18px">' +
          '<div class="card"><div class="card-label">Your career assets</div><ul class="list-clean">' +
            s.strengths.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
            '<p class="small mt-2 mb-0">Ruled by ' + esc(s.ruler) + ' · strongest on ' + esc(s.luckyDay) + 's</p></div>' +
          '<div class="card"><div class="card-label">Career weather today</div>' +
            meter(flow.label, flow.pct) +
            '<p class="card-body mb-0">' + esc(flow.line) + '</p>' +
            '<p class="small mt-2 mb-0">Moon in ' + esc(SIGNS[transitMoon].name) + ' · ' + esc(D.MOON_WEATHER[transitMoon].mood) + '</p></div>' +
        '</div></div>';
    }

    if (tab === 'love') {
      const need = {
        Fire: 'Adventure, directness, and someone who is not intimidated by your heat.',
        Earth: 'Presence, touch, reliability, and a life that feels good to come home to.',
        Air: 'Conversation, space, and a mind that keeps you interested.',
        Water: 'Depth, emotional safety, and someone who will not flinch at the feeling.',
      }[s.element];
      body = '<div class="grid grid-2" style="align-items:start">' +
        '<div class="card gold prose"><div class="card-label">Love life</div>' +
          '<p class="lead">' + esc(s.love) + '</p>' +
          '<div class="callout">' + esc(D.MOON_WEATHER[transitMoon].note) + '</div></div>' +
        '<div class="grid" style="gap:18px">' +
          '<div class="card"><div class="card-label">What you actually need</div>' +
            '<p class="card-body">' + esc(need) + '</p></div>' +
          '<div class="card"><div class="card-label">Love weather today</div>' +
            '<p class="card-body" style="font-family:var(--serif);font-size:18px;color:#ded6ee">' + esc(read.love) + '</p>' +
            '<a class="btn ghost small" href="#match">Check a compatibility →</a></div>' +
          '<div class="card"><div class="card-label">The shadow to name</div><ul class="list-clean">' +
            s.shadow.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
        '</div></div>';
    }

    if (tab === 'money') {
      const moneyRitual = R.MONEY[state.sign];
      body = '<div class="grid grid-2" style="align-items:start">' +
        '<div class="card gold prose"><div class="card-label">Money &amp; worth</div>' +
          '<p class="lead">' + esc(s.money) + '</p>' +
          '<div class="callout">' + esc(moneyRitual.affirmation) + '</div>' +
          '<div class="btn-row"><a class="btn ghost small" href="#rituals">Open the money rituals →</a></div></div>' +
        '<div class="grid" style="gap:18px">' +
          '<div class="card"><div class="card-label">Your money weather</div>' +
            '<p class="card-body" style="font-family:var(--serif);font-size:18px;color:#ded6ee">' + esc(read.money) + '</p>' +
            meter(flow.label, flow.pct) + '</div>' +
          '<div class="card"><div class="card-label">A ritual that suits you</div>' +
            '<h3 class="card-title">' + esc(moneyRitual.title) + '</h3>' +
            '<p class="card-body">' + esc(moneyRitual.focus) + '</p>' +
            '<button class="btn ghost small" type="button" data-act="view-money">See the steps →</button></div>' +
        '</div></div>';
    }

    if (tab === 'relocation') {
      const dests = D.DESTINATIONS.map(function (d) {
        return { d: d, score: relocationScore(s, d) };
      }).sort(function (x, y) { return y.score - x.score; });
      const current = D.DESTINATIONS.find(function (d) { return d.city === state.destination; }) || dests[0].d;
      const curScore = relocationScore(s, current);
      const pair = pairText(s.element, current.element);
      const aff = D.elementAffinity(s.element, current.element);
      const matchWord = aff >= 0.9 ? 'nourishing' : aff >= 0.7 ? 'stimulating' : 'transformative';

      body = '<div class="grid grid-2" style="align-items:start">' +
        '<div class="card"><div class="card-label">Where are you drawn?</div>' +
          '<p class="card-body">Pick a place. The reading below blends your sign with the city’s elemental character — a poetic approximation, not an astrocartography chart.</p>' +
          '<div class="field mt-2"><label for="dest-select">Destination</label>' +
          '<select class="select" id="dest-select" data-act="dest">' +
            D.DESTINATIONS.map(function (d) {
              return '<option value="' + esc(d.city) + '"' + (d.city === current.city ? ' selected' : '') + '>' + d.glyph + '  ' + esc(d.city) + ', ' + esc(d.country) + '</option>';
            }).join('') +
          '</select></div>' +
          '<div class="card-label mt-3">Strongest pulls for ' + esc(s.name) + '</div>' +
          '<div class="dest-list">' + dests.slice(0, 4).map(function (row) {
            return '<button type="button" class="dest ' + (row.d.city === current.city ? 'active' : '') + '" data-act="dest-pick" data-city="' + esc(row.d.city) + '">' +
              '<span class="d-flag">' + row.d.glyph + '</span>' +
              '<span><span class="d-name">' + esc(row.d.city) + '</span><br /><span class="d-region">' + esc(row.d.country) + ' · ' + esc(row.d.element) + '</span></span>' +
              '<span class="d-score">' + row.score + '</span></button>';
          }).join('') + '</div></div>' +

        '<div class="card gold"><div class="eyebrow">' + esc(current.country) + '</div>' +
          '<h2 class="card-title" style="font-size:32px">' + current.glyph + ' ' + esc(current.city) + '</h2>' +
          '<p class="prose lead">' + esc(current.blurb) + '</p>' +
          '<div class="grid grid-2" style="gap:12px">' +
            '<div class="fact"><div class="f-label">Pull</div><div class="f-value">' + curScore + '<span style="font-size:14px;color:var(--muted-2)">/100</span></div><div class="f-sub">' + esc(matchWord) + ' match</div></div>' +
            '<div class="fact"><div class="f-label">Best season</div><div class="f-value" style="font-size:16px">' + esc(current.season) + '</div><div class="f-sub">when to arrive</div></div>' +
          '</div>' +
          '<hr class="divider" />' +
          '<div class="card-label">What it awakens</div><p class="card-body">' + esc(pair.spark) + '</p>' +
          '<div class="card-label">What it will test</div><p class="card-body">' + esc(pair.friction) + '</p>' +
          '<div class="callout">' + esc(relocateRitual(current)) + '</div>' +
          '<div class="traits mt-2">' + current.tags.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>' +
        '</div></div>';
    }

    return '<section class="view">' +
      pageHead('Life paths', 'The long conversation', 'Advice, work, love, money and place — read through the sign you are moving through right now.') +
      '<div class="tabs">' + LIFE_TABS.map(function (t) {
        return '<button type="button" class="tab ' + (tab === t.id ? 'active' : '') + '" data-act="life-tab" data-tab="' + t.id + '">' + t.label + '</button>';
      }).join('') + '</div>' +
      '<div class="section-head" style="margin-top:26px"><div><div class="eyebrow">Reading for</div>' +
        '<h2 class="section-title">' + s.symbol + ' ' + esc(s.name) + '</h2></div>' +
        '<p class="section-sub">' + esc(s.tagline) + '</p></div>' +
      signStripHTML() +
      '<div class="mt-3">' + body + '</div>' +
    '</section>';
  }

  /* ------------------------------------------------------------
     VIEW — moon
     ------------------------------------------------------------ */

  function monthCells(year, month) {
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const count = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    const start = new Date(year, month, 1 - startOffset);
    const cells = [];
    for (let i = 0; i < count; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12, 0, 0);
      cells.push({ date: d, other: d.getMonth() !== month });
    }
    return cells;
  }

  function dayInfo(date) {
    const jd = A.toJD(date);
    const phase = A.phaseInfo(jd);
    const moonLon = A.moonLongitude(jd);
    const moonSign = A.signId(moonLon);
    const angle = phase.angle;
    const isNew = angle < 1.6 || angle > 358.4;
    const isFull = Math.abs(angle - 180) < 1.6;
    return { phase: phase, moonSign: moonSign, moonLon: moonLon, isNew: isNew, isFull: isFull };
  }

  function calendarHTML() {
    const year = state.calYear;
    const month = state.calMonth;
    const cells = monthCells(year, month);
    const todayStr = todayISO();
    const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const head = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(function (d) { return '<th>' + d + '</th>'; }).join('');

    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      const week = cells.slice(i, i + 7).map(function (cell) {
        const info = dayInfo(cell.date);
        const iso = isoDate(cell.date);
        const classes = ['cal-day'];
        if (cell.other) classes.push('other');
        if (iso === todayStr) classes.push('today');
        if (info.isNew || info.isFull) classes.push('event');
        if (iso === state.moonDate) classes.push('selected');
        const abbrev = SIGNS[info.moonSign].name.slice(0, 3);
        return '<td><button type="button" class="' + classes.join(' ') + '" data-act="pick-day" data-date="' + iso + '" title="' + esc(info.phase.name + ' in ' + SIGNS[info.moonSign].name) + '">' +
          '<span class="cd-num">' + cell.date.getDate() + '</span>' +
          '<span class="cd-moon">' + info.phase.glyph + '</span>' +
          '<span class="cd-sign">' + abbrev + '</span></button></td>';
      }).join('');
      rows.push('<tr>' + week + '</tr>');
    }

    return '<div class="cal-nav">' +
        '<button class="icon-btn" type="button" data-act="cal-prev" aria-label="Previous month">‹</button>' +
        '<h4>' + esc(monthLabel) + '</h4>' +
        '<button class="icon-btn" type="button" data-act="cal-next" aria-label="Next month">›</button>' +
      '</div>' +
      '<table class="cal"><thead><tr>' + head + '</tr></thead><tbody>' + rows.join('') + '</tbody></table>' +
      '<div class="btn-row mt-2"><button class="btn ghost small" type="button" data-act="cal-today">Jump to today</button>' +
        '<span class="tiny">Dot = new or full moon · click any day</span></div>';
  }

  function viewMoon() {
    const selected = parseDay(state.moonDate);
    const jd = A.toJD(selected);
    const phase = A.phaseInfo(jd);
    const moonLon = A.moonLongitude(jd);
    const moonSign = A.signId(moonLon);
    const guidance = R.PHASE_GUIDANCE[phase.id];
    const events = upcomingEvents().slice(0, 4);
    const nowPhase = A.phaseInfo(A.toJD(new Date()));
    const nextNew = upcomingEvents().find(function (e) { return e.kind === 'new'; });
    const nextFull = upcomingEvents().find(function (e) { return e.kind === 'full'; });
    const ill = illumText(phase.illumination);
    const isToday = state.moonDate === todayISO();

    const ladder = A.PHASES.map(function (p) {
      return '<div class="phase-step ' + (p.id === nowPhase.id ? 'active' : '') + '">' +
        '<div class="ps-glyph">' + p.glyph + '</div><div class="ps-name">' + p.short + '</div></div>';
    }).join('');

    const eventsHTML = events.map(function (e) {
      return '<div class="event-row"><div class="event-glyph">' + e.glyph + '</div>' +
        '<div><div class="event-name">' + e.name + ' in ' + SIGNS[e.sign].name + '</div>' +
        '<div class="event-meta">' + esc(e.signDegree) + ' ' + esc(SIGNS[e.sign].name) + '</div></div>' +
        '<div class="event-when"><b>' + e.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + '</b>' +
        e.date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) + '</div></div>';
    }).join('');

    return '<section class="view">' +
      pageHead('Moon tracking', 'The sky tonight', 'Real positions, not approximations. Every phase on this page is calculated from the actual elongation of the Moon from the Sun.') +

      '<div class="card gold">' +
        '<div class="moon-hero">' +
          '<div class="moon-stage"><canvas class="moon-canvas" data-moon data-fraction="' + phase.illumination + '" data-waxing="' + phase.waxing + '" role="img" aria-label="' + esc(phase.name) + '"></canvas>' +
            '<div class="moon-caption"><div class="phase-name">' + phase.name + '</div>' +
            '<div class="phase-sub">' + (isToday ? 'Tonight' : esc(A.formatDate(selected))) + '</div></div></div>' +
          '<div>' +
            '<div class="card-label">' + (isToday ? 'Live' : 'Preview') + '</div>' +
            '<h2 class="section-title">Moon in ' + esc(SIGNS[moonSign].name) + '</h2>' +
            '<p class="page-sub">' + esc(D.MOON_WEATHER[moonSign].title) + ' — ' + esc(D.MOON_WEATHER[moonSign].mood) + '</p>' +
            '<div class="moon-facts mt-2">' +
              '<div class="fact"><div class="f-label">Illumination</div><div class="f-value">' + ill + '%</div><div class="f-sub">' + (phase.waxing ? 'waxing' : 'waning') + '</div></div>' +
              '<div class="fact"><div class="f-label">Moon sign</div><div class="f-value">' + SIGNS[moonSign].symbol + ' ' + esc(SIGNS[moonSign].name) + '</div><div class="f-sub">' + esc(A.formatDegree(moonLon)) + '</div></div>' +
              '<div class="fact"><div class="f-label">Next new moon</div><div class="f-value" style="font-size:17px">' + (nextNew ? nextNew.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—') + '</div><div class="f-sub">' + (nextNew ? 'in ' + esc(SIGNS[nextNew.sign].name) : '') + '</div></div>' +
              '<div class="fact"><div class="f-label">Next full moon</div><div class="f-value" style="font-size:17px">' + (nextFull ? nextFull.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—') + '</div><div class="f-sub">' + (nextFull ? 'in ' + esc(SIGNS[nextFull.sign].name) : '') + '</div></div>' +
            '</div>' +
            '<p class="small mt-2 mb-0">' + esc(D.MOON_WEATHER[moonSign].note) + '</p>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="card mt-3"><div class="card-label">The eight phases</div>' +
        '<div class="phase-ladder">' + ladder + '</div>' +
        '<p class="tiny mt-2 mb-0">Currently ' + esc(nowPhase.name) + ' · ' + illumText(nowPhase.illumination) + '% lit</p></div>' +

      '<div class="grid grid-2 mt-3" style="align-items:start">' +
        '<div class="card"><div class="card-label">Moon calendar</div>' + calendarHTML() + '</div>' +
        '<div class="grid" style="gap:18px">' +
          '<div class="card"><div class="card-label">' + esc(A.formatDate(selected)) + '</div>' +
            '<h3 class="card-title">' + phase.glyph + ' ' + esc(guidance.title) + '</h3>' +
            '<p class="card-body">' + esc(guidance.focus) + '</p>' +
            '<div class="kv">' +
              '<div class="kv-row"><span>Phase</span><span>' + esc(phase.name) + '</span></div>' +
              '<div class="kv-row"><span>Illumination</span><span>' + ill + '%</span></div>' +
              '<div class="kv-row"><span>Moon in</span><span>' + SIGNS[moonSign].symbol + ' ' + esc(SIGNS[moonSign].name) + '</span></div>' +
              '<div class="kv-row"><span>Moon age</span><span>' + A.ageOfMoon(jd).toFixed(1) + ' days</span></div>' +
            '</div>' +
            '<div class="callout">' + esc(guidance.prompt) + '</div>' +
            '<p class="small mb-0"><strong style="color:var(--text)">Do:</strong> ' + esc(guidance.do) + '</p>' +
            '<p class="small mb-0"><strong style="color:var(--text)">Release:</strong> ' + esc(guidance.release) + '</p>' +
          '</div>' +
          '<div class="card"><div class="card-label">Next four phase events</div>' + eventsHTML + '</div>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  /* ------------------------------------------------------------
     VIEW — rituals
     ------------------------------------------------------------ */

  const RITUAL_TABS = [
    { id: 'new', label: 'New moon' },
    { id: 'full', label: 'Full moon' },
    { id: 'beauty', label: 'Beauty & glamour' },
    { id: 'money', label: 'Money' },
    { id: 'more', label: 'More rituals' },
  ];

  const BEAUTY_PHASE = {
    new: 'New moon beauty is preparation: cleanse deeper, plan the next four weeks of skin, start the treatment rather than finishing it. Moisturise with intention.',
    'waxing-crescent': 'Waxing crescent is for growth: length, strength, nails, brows, hair oiling. What you feed now thickens.',
    'first-quarter': 'First quarter is action: exfoliate, book the appointment, change the thing you have been meaning to change.',
    'waxing-gibbous': 'Waxing gibbous is refinement: perfect the routine, edit the wardrobe, do the trial run.',
    full: 'Full moon is the glow: hydrate, highlight, go out, be photographed. The skin shows what you have been feeding it.',
    'waning-gibbous': 'Waning gibbous is sharing: wear the good thing, use the expensive product, let yourself be seen.',
    'last-quarter': 'Last quarter is clearing: declutter the shelf, wash the brushes, throw out the expired. Skin likes less.',
    'waning-crescent': 'Balsamic moon is rest: minimal products, sleep, silence, no new experiments. Recovery is the treatment.',
  };

  function ritualCardHTML(r, opts) {
    opts = opts || {};
    return '<div class="card gold ritual">' +
      '<div class="ritual-top"><div class="ritual-glyph">' + (opts.glyph || '☾') + '</div>' +
        '<div><h3>' + esc(r.title) + '</h3><div class="r-sub">' + esc(opts.sub || r.bestFor || r.focus || '') + '</div></div></div>' +
      '<p class="ritual-intent">' + esc(opts.intent || r.intention || r.vibe || '') + '</p>' +
      (r.steps ? '<ol class="steps">' + r.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' : '') +
      (r.ritual ? '<p class="card-body">' + esc(r.ritual) + '</p>' : '') +
      (r.spell ? '<div class="callout">' + esc(r.spell) + '</div>' : '') +
      '<div class="ritual-foot">' +
        '<div class="ritual-meta">' +
          (r.crystals || []).map(function (c) { return '<span class="mini-tag crystal">' + esc(c) + '</span>'; }).join('') +
          (r.herbs || []).map(function (h) { return '<span class="mini-tag herb">' + esc(h) + '</span>'; }).join('') +
          (r.ingredients || []).map(function (i) { return '<span class="mini-tag">' + esc(i) + '</span>'; }).join('') +
        '</div>' +
        (r.journal ? '<p class="small mb-0"><strong style="color:var(--gold-soft)">Journal:</strong> ' + esc(r.journal) + '</p>' : '') +
        (opts.save !== false ? '<div class="btn-row">' +
          '<button class="btn ghost small" type="button" data-act="save-ritual" data-title="' + esc(r.title) + '" data-intent="' + esc(opts.intent || r.intention || r.vibe || '') + '" data-prompt="' + esc(r.journal || '') + '">Save to journal</button>' +
          '</div>' : '') +
      '</div></div>';
  }

  function viewRituals() {
    const tab = state.ritualTab;
    const s = SIGNS[state.sign];
    const nextNew = upcomingEvents().find(function (e) { return e.kind === 'new'; });
    const nextFull = upcomingEvents().find(function (e) { return e.kind === 'full'; });
    const nowPhase = A.phaseInfo(A.toJD(new Date()));
    let body = '';

    if (tab === 'new') {
      const r = R.NEW_MOON[state.sign];
      const thisMonth = nextNew ? R.NEW_MOON[nextNew.sign] : null;
      body = '<div class="grid grid-2" style="align-items:start">' +
        ritualCardHTML(r, { glyph: '🌑', sub: 'New moon in ' + s.name + ' · ' + r.bestFor }) +
        '<div class="grid" style="gap:18px">' +
          '<div class="card"><div class="card-label">This month’s new moon</div>' +
            (nextNew ? '<h3 class="card-title">' + nextNew.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) + '</h3>' +
              '<p class="card-body">New moon at ' + esc(nextNew.signDegree) + ' ' + esc(SIGNS[nextNew.sign].name) + '. ' + esc(R.NEW_MOON[nextNew.sign].bestFor) + '.</p>' +
              '<button class="btn ghost small" type="button" data-act="sign" data-sign="' + nextNew.sign + '">Read that ritual →</button>' : '<p class="card-body">Calculating…</p>') +
          '</div>' +
          '<div class="card"><div class="card-label">How to work with the new moon</div>' +
            '<ul class="list-clean"><li>Write the intention in the present tense.</li><li>Keep it to one or two things — the dark moon rewards focus.</li><li>Start something physically, not just mentally.</li><li>Do not demand evidence yet. This is the planting, not the harvest.</li></ul></div>' +
        '</div></div>';
    }

    if (tab === 'full') {
      const r = R.FULL_MOON[state.sign];
      body = '<div class="grid grid-2" style="align-items:start">' +
        ritualCardHTML(r, { glyph: '🌕', sub: 'Full moon in ' + s.name + ' · releasing ' + r.release.toLowerCase() }) +
        '<div class="grid" style="gap:18px">' +
          '<div class="card"><div class="card-label">This month’s full moon</div>' +
            (nextFull ? '<h3 class="card-title">' + nextFull.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) + '</h3>' +
              '<p class="card-body">Full moon at ' + esc(nextFull.signDegree) + ' ' + esc(SIGNS[nextFull.sign].name) + '. ' + esc(R.FULL_MOON[nextFull.sign].release) + '.</p>' +
              '<button class="btn ghost small" type="button" data-act="sign" data-sign="' + nextFull.sign + '">Read that ritual →</button>' : '<p class="card-body">Calculating…</p>') +
          '</div>' +
          '<div class="card"><div class="card-label">How to work with the full moon</div>' +
            '<ul class="list-clean"><li>Name what is true before you decide what to do about it.</li><li>Release in writing — specificity is the magic.</li><li>Let the feeling be big without letting it drive.</li><li>Celebrate something. Full moons are also feasts.</li></ul></div>' +
        '</div></div>';
    }

    if (tab === 'beauty') {
      const r = R.BEAUTY[state.sign];
      body = '<div class="grid grid-2" style="align-items:start">' +
        ritualCardHTML(r, { glyph: '✦', sub: 'Glamour magic for ' + s.name, save: true }) +
        '<div class="grid" style="gap:18px">' +
          '<div class="card"><div class="card-label">Tonight’s phase · ' + esc(nowPhase.name) + '</div>' +
            '<p class="card-body">' + esc(BEAUTY_PHASE[nowPhase.id]) + '</p>' +
            '<p class="small mb-0">Your sign’s colours: ' + s.colors.map(function (c) { return esc(c.name); }).join(' · ') + '</p>' +
            '<div class="swatches mt-2">' + s.colors.map(function (c) { return '<span class="swatch" style="background:' + c.hex + '" title="' + esc(c.name) + '"></span>'; }).join('') + '</div></div>' +
          '<div class="card"><div class="card-label">The glamour note</div>' +
            '<h3 class="card-title">' + esc(s.beautyVibe) + '</h3>' +
            '<p class="card-body">Scent to wear: ' + esc(s.scent) + '.</p>' +
            '<p class="small mb-0">Beauty magic is not about becoming someone else. It is about making the outside legible to the inside.</p></div>' +
        '</div></div>';
    }

    if (tab === 'money') {
      const r = R.MONEY[state.sign];
      body = '<div class="grid grid-2" style="align-items:start">' +
        ritualCardHTML(r, { glyph: '◈', sub: 'Money magic for ' + s.name + ' · ' + r.focus }) +
        '<div class="grid" style="gap:18px">' +
          '<div class="card"><div class="card-label">The rule of the working</div>' +
            '<p class="card-body" style="font-family:var(--serif);font-size:19px;color:#ded6ee">' + esc(r.affirmation) + '</p>' +
            '<div class="callout">' + esc(R.MONEY[state.sign].focus) + ' is the doorway. The ritual only works if you do one real thing in the material world.</div></div>' +
          '<div class="card"><div class="card-label">Moon timing</div>' +
            '<ul class="list-clean"><li><b>Waxing moons</b> — attracting, asking, launching, invoicing.</li><li><b>Full moon</b> — visibility, negotiation, being paid what you are worth.</li><li><b>Waning moons</b> — releasing debt, cancelling leaks, clearing paperwork.</li></ul>' +
            '<p class="small mt-2 mb-0">Currently ' + esc(nowPhase.name) + '.</p></div>' +
        '</div></div>';
    }

    if (tab === 'more') {
      body = '<div class="ritual-grid">' + R.OTHER_RITUALS.map(function (r) {
        return '<div class="card ritual"><div class="ritual-top"><div class="ritual-glyph">' + r.glyph + '</div>' +
          '<div><h3>' + esc(r.title) + '</h3><div class="r-sub">' + esc(r.sub) + '</div></div></div>' +
          '<p class="ritual-intent">' + esc(r.intent) + '</p>' +
          '<div class="ritual-foot"><div class="ritual-meta">' + r.meta.map(function (m) { return '<span class="mini-tag">' + esc(m) + '</span>'; }).join('') + '</div>' +
          '<div class="btn-row"><button class="btn ghost small" type="button" data-act="view-ritual" data-id="' + r.id + '">View ritual →</button></div></div></div>';
      }).join('') + '</div>';
    }

    return '<section class="view">' +
      pageHead('Rituals', 'A practice, not a performance', 'New and full moon workings, glamour magic, money rituals and the quiet housekeeping of a spiritual life.') +
      '<div class="tabs">' + RITUAL_TABS.map(function (t) {
        return '<button type="button" class="tab ' + (tab === t.id ? 'active' : '') + '" data-act="ritual-tab" data-tab="' + t.id + '">' + t.label + '</button>';
      }).join('') + '</div>' +
      (tab !== 'more' ? '<div class="section-head" style="margin-top:26px"><div><div class="eyebrow">Tuned to</div>' +
        '<h2 class="section-title">' + s.symbol + ' ' + esc(s.name) + '</h2></div>' +
        '<p class="section-sub">Change the sign to work with a different flavour of the same moon.</p></div>' + signStripHTML() : '') +
      '<div class="mt-3">' + body + '</div>' +
      '<p class="tiny mt-3">Candle, smoke and paper-burning rituals require fire safety: never leave a flame unattended, keep water nearby, and skip any step that is unsafe for your space or health. Nothing here replaces medical, legal or financial care.</p>' +
    '</section>';
  }

  /* ------------------------------------------------------------
     VIEW — journal
     ------------------------------------------------------------ */

  function moonLine(date) {
    const jd = A.toJD(date);
    const p = A.phaseInfo(jd);
    const sign = A.signId(A.moonLongitude(jd));
    return p.glyph + ' ' + p.name + ' in ' + SIGNS[sign].name + ' · ' + illumText(p.illumination) + '% lit';
  }

  function journalFormHTML(prefill, kind) {
    const kinds = ['Daily note', 'New moon intention', 'Full moon release', 'Ritual', 'Gratitude', 'Dream'];
    return '<form data-form="journal" data-modal="1" class="grid" style="gap:14px">' +
      '<div class="field"><label for="j-kind">Entry type</label><select class="select" id="j-kind" name="kind">' +
        kinds.map(function (k) { return '<option' + ((kind || 'Daily note') === k ? ' selected' : '') + '>' + k + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="field"><label for="j-text">Your words</label>' +
      '<textarea class="textarea" id="j-text" name="text" placeholder="What is actually true right now?" required>' + esc(prefill || '') + '</textarea></div>' +
      '<div class="btn-row"><button class="btn" type="submit">Save entry</button>' +
      '<span class="tiny">' + esc(moonLine(new Date())) + '</span></div>' +
    '</form>';
  }

  function viewJournal() {
    const entries = state.journal.slice().sort(function (a, b) { return b.at - a.at; });
    const list = entries.length ? entries.map(function (e) {
      return '<div class="entry"><div class="entry-head">' +
        '<span class="entry-date">' + esc(new Date(e.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })) + '</span>' +
        '<span class="entry-kind">' + esc(e.kind) + '</span>' +
        '<button class="entry-del" type="button" data-act="del-entry" data-id="' + esc(e.id) + '" aria-label="Delete entry">✕</button></div>' +
        '<div class="entry-body">' + esc(e.text) + '</div>' +
        (e.moon ? '<div class="entry-moon">' + esc(e.moon) + '</div>' : '') +
        '</div>';
    }).join('') : '<div class="empty"><span class="big">☾</span>Nothing written yet. The page is a good place to put the thing you are not saying out loud.</div>';

    return '<section class="view">' +
      pageHead('Journal', 'The record of you', 'Intentions, releases, dreams and the ordinary Tuesdays. Stored only in this browser.') +
      '<div class="journal-grid">' +
        '<div class="card gold"><div class="card-label">New entry</div>' +
          '<h2 class="card-title">What is true today?</h2>' +
          '<div class="mt-2">' + journalFormHTML('', 'Daily note').replace('data-modal="1"', '') + '</div>' +
        '</div>' +
        '<div><div class="section-head" style="margin-top:0"><div><div class="eyebrow">' + entries.length + ' entries</div>' +
          '<h2 class="section-title">Your notes</h2></div>' +
          (entries.length ? '<button class="btn ghost small" type="button" data-act="export-journal">Export .txt</button>' : '') +
        '</div>' + list + '</div>' +
      '</div>' +
    '</section>';
  }

  /* ------------------------------------------------------------
     modal
     ------------------------------------------------------------ */

  const modal = $('#modal');
  const modalBody = $('#modalBody');
  let lastFocused = null;

  function openModal(html) {
    lastFocused = document.activeElement;
    modalBody.innerHTML = html;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    const focusable = modalBody.querySelector('input, textarea, select, button');
    if (focusable) setTimeout(function () { focusable.focus(); }, 50);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    modalBody.innerHTML = '';
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function openProfileModal() {
    openModal('<h2>Your birth sky</h2><p class="m-sub">Sun, Moon and phase. Calculated locally and kept in your browser.</p>' +
      profileFormHTML(state.profile, true));
  }

  function openJournalModal(prefill, kind) {
    openModal('<h2>Write it down</h2><p class="m-sub">' + esc(moonLine(new Date())) + '</p>' +
      journalFormHTML(prefill || '', kind || 'Daily note'));
  }

  function openRitualModal(id) {
    const r = R.OTHER_RITUALS.find(function (x) { return x.id === id; });
    if (!r) return;
    openModal('<h2>' + esc(r.title) + '</h2><p class="m-sub">' + esc(r.sub) + '</p>' +
      '<p class="card-body">' + esc(r.intent) + '</p>' +
      '<ol class="steps mt-2">' + r.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      '<div class="ritual-meta mt-2">' + r.meta.map(function (m) { return '<span class="mini-tag">' + esc(m) + '</span>'; }).join('') + '</div>' +
      '<p class="small mt-2">Best time: ' + esc(r.when) + '.</p>' +
      '<div class="btn-row"><button class="btn" type="button" data-act="save-ritual" data-title="' + esc(r.title) + '" data-intent="' + esc(r.intent) + '" data-prompt="">Save to journal</button></div>');
  }

  function openMoneyModal() {
    const r = R.MONEY[state.sign];
    openModal('<h2>' + esc(r.title) + '</h2><p class="m-sub">Money magic for ' + esc(SIGNS[state.sign].name) + ' · ' + esc(r.focus) + '</p>' +
      '<p class="card-body">' + esc(r.intention) + '</p>' +
      '<ol class="steps mt-2">' + r.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      '<p class="affirm">' + esc(r.affirmation) + '</p>' +
      '<div class="ritual-meta mt-2">' + r.crystals.map(function (c) { return '<span class="mini-tag crystal">' + esc(c) + '</span>'; }).join('') +
      r.herbs.map(function (h) { return '<span class="mini-tag herb">' + esc(h) + '</span>'; }).join('') + '</div>');
  }

  /* ------------------------------------------------------------
     toast
     ------------------------------------------------------------ */

  let toastTimer = null;
  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2400);
  }

  /* ------------------------------------------------------------
     router / render
     ------------------------------------------------------------ */

  const views = {
    today: viewToday,
    you: viewYou,
    match: viewMatch,
    life: viewLife,
    moon: viewMoon,
    rituals: viewRituals,
    journal: viewJournal,
  };

  let lastView = null;

  function currentView() {
    const id = (location.hash || '#today').replace('#', '');
    return views[id] ? id : 'today';
  }

  function setNavActive(id) {
    $$('#nav a').forEach(function (a) {
      const active = a.dataset.view === id;
      a.classList.toggle('active', active);
      if (active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function updateChip() {
    const sky = profileSky();
    $('#chipText').textContent = sky
      ? ((state.profile.name ? state.profile.name + ' · ' : '') + SIGNS[sky.sunSign].name)
      : 'Set your birth sky';
    $('.chip-sigil').textContent = sky ? SIGNS[sky.sunSign].symbol : '✦';
  }

  function render() {
    const id = currentView();
    state.view = id;
    setNavActive(id);
    updateChip();

    const app = $('#app');
    app.innerHTML = views[id]();

    hydrateMoons(app);
    observeReveals();

    if (id !== lastView) {
      window.scrollTo(0, 0);
      lastView = id;
    }
    document.title = 'Astraea — ' + (id === 'today' ? 'Daily Astrology & Moon Magic' : id.charAt(0).toUpperCase() + id.slice(1));
  }

  let revealObserver = null;
  let revealFailsafe = null;

  function observeReveals() {
    const els = $$('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: '120px 0px 120px 0px' });
    }
    els.forEach(function (el) { revealObserver.observe(el); });

    // Failsafe: never leave content permanently invisible if observation misfires.
    clearTimeout(revealFailsafe);
    revealFailsafe = setTimeout(function () {
      $$('.reveal:not(.in)').forEach(function (el) { el.classList.add('in'); });
    }, 5000);
  }

  /* ------------------------------------------------------------
     events
     ------------------------------------------------------------ */

  function saveProfileFromForm(form) {
    const data = new FormData(form);
    const date = String(data.get('date') || '').trim();
    if (!date) { toast('A birth date helps — even just the day.'); return false; }
    const profile = {
      name: String(data.get('name') || '').trim(),
      date: date,
      time: String(data.get('time') || '').trim(),
    };
    state.profile = profile;
    writeLS(LS_PROFILE, profile);
    syncSignWithProfile();
    updateChip();
    return true;
  }

  function saveJournalEntry(form) {
    const data = new FormData(form);
    const text = String(data.get('text') || '').trim();
    if (!text) { toast('Write something, even one sentence.'); return; }
    const entry = {
      id: 'e' + Date.now() + Math.floor(Math.random() * 1000),
      at: Date.now(),
      kind: String(data.get('kind') || 'Daily note'),
      text: text,
      moon: moonLine(new Date()),
    };
    state.journal.push(entry);
    writeLS(LS_JOURNAL, state.journal);
    toast('Saved to your journal ☾');
    closeModal();
    if (currentView() === 'journal') render();
  }

  document.addEventListener('submit', function (e) {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    const type = form.dataset.form;
    if (type === 'profile') {
      if (saveProfileFromForm(form)) {
        toast('Your sky is set ✦');
        const inModal = form.dataset.modal === '1';
        if (inModal) closeModal();
        if (currentView() === 'you' || currentView() === 'today') render();
        else render();
      }
    } else if (type === 'journal') {
      saveJournalEntry(form);
    }
  });

  document.addEventListener('click', function (e) {
    const closeTarget = e.target.closest('[data-close="modal"]');
    if (closeTarget) { closeModal(); return; }

    const target = e.target.closest('[data-act]');
    if (!target) return;
    const act = target.dataset.act;

    if (act === 'sign') {
      state.sign = target.dataset.sign;
      render();
    } else if (act === 'open-profile') {
      openProfileModal();
    } else if (act === 'clear-profile') {
      state.profile = null;
      writeLS(LS_PROFILE, null);
      closeModal();
      updateChip();
      toast('Birth sky cleared');
      render();
    } else if (act === 'life-tab') {
      state.lifeTab = target.dataset.tab;
      render();
    } else if (act === 'ritual-tab') {
      state.ritualTab = target.dataset.tab;
      render();
    } else if (act === 'swap-match') {
      const a = state.matchA;
      state.matchA = state.matchB;
      state.matchB = a;
      render();
    } else if (act === 'surprise-match') {
      const rand = function () { return ORDER[Math.floor(Math.random() * ORDER.length)]; };
      state.matchA = rand();
      state.matchB = rand();
      render();
    } else if (act === 'pick-match') {
      state.matchB = target.dataset.sign;
      render();
    } else if (act === 'dest-pick') {
      state.destination = target.dataset.city;
      render();
    } else if (act === 'cal-prev') {
      state.calMonth -= 1;
      if (state.calMonth < 0) { state.calMonth = 11; state.calYear -= 1; }
      render();
    } else if (act === 'cal-next') {
      state.calMonth += 1;
      if (state.calMonth > 11) { state.calMonth = 0; state.calYear += 1; }
      render();
    } else if (act === 'cal-today') {
      const now = new Date();
      state.moonDate = todayISO();
      state.calYear = now.getFullYear();
      state.calMonth = now.getMonth();
      render();
    } else if (act === 'pick-day') {
      state.moonDate = target.dataset.date;
      const d = parseDay(target.dataset.date);
      state.calYear = d.getFullYear();
      state.calMonth = d.getMonth();
      render();
    } else if (act === 'journal-new') {
      openJournalModal(target.dataset.prefill || '', 'Daily note');
    } else if (act === 'save-ritual') {
      const title = target.dataset.title || 'Ritual';
      const intent = target.dataset.intent || '';
      const prompt = target.dataset.prompt || '';
      const prefill = 'Ritual: ' + title + '\n' + (intent ? 'Intention: ' + intent + '\n' : '') + (prompt ? '\n' + prompt + '\n' : '\n');
      closeModal();
      openJournalModal(prefill, 'Ritual');
    } else if (act === 'view-ritual') {
      openRitualModal(target.dataset.id);
    } else if (act === 'view-money') {
      openMoneyModal();
    } else if (act === 'del-entry') {
      state.journal = state.journal.filter(function (x) { return x.id !== target.dataset.id; });
      writeLS(LS_JOURNAL, state.journal);
      toast('Removed');
      render();
    } else if (act === 'export-journal') {
      exportJournal();
    }
  });

  document.addEventListener('change', function (e) {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const act = t.dataset.act;
    if (act === 'matchA') {
      state.matchA = t.value;
      render();
    } else if (act === 'matchB') {
      state.matchB = t.value;
      render();
    } else if (act === 'dest') {
      state.destination = t.value;
      render();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  window.addEventListener('hashchange', render);
  window.addEventListener('resize', function () {
    const moons = $$('canvas[data-moon]');
    if (moons.length) hydrateMoons(document);
  });

  function exportJournal() {
    const lines = state.journal.slice().sort(function (a, b) { return a.at - b.at; }).map(function (e) {
      return new Date(e.at).toLocaleString() + '  ·  ' + e.kind + '\n' + (e.moon ? e.moon + '\n' : '') + e.text + '\n' + '-'.repeat(48) + '\n';
    });
    const blob = new Blob(['ASTRAEA JOURNAL\n\n' + lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'astraea-journal.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('Journal exported');
  }

  /* ------------------------------------------------------------
     starfield
     ------------------------------------------------------------ */

  function initStars() {
    const canvas = $('#starfield');
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let stars = [];
    let meteors = [];
    let width = 0;
    let height = 0;
    let raf = null;
    let lastSpawn = 0;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(240, Math.floor((width * height) / 7200));
      stars = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 1.25 + 0.25,
          base: Math.random() * 0.45 + 0.18,
          speed: Math.random() * 0.9 + 0.25,
          phase: Math.random() * Math.PI * 2,
          drift: (Math.random() - 0.5) * 0.03,
        });
      }
      draw(performance.now());
    }

    function draw(t) {
      ctx.clearRect(0, 0, width, height);

      stars.forEach(function (s) {
        const twinkle = s.base + Math.sin(t * 0.001 * s.speed + s.phase) * 0.22;
        const alpha = Math.max(0.05, Math.min(0.85, twinkle));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(240, 236, 255, ' + alpha.toFixed(3) + ')';
        ctx.fill();
        if (s.r > 1.1) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 2.6, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(200, 190, 255, ' + (alpha * 0.07).toFixed(3) + ')';
          ctx.fill();
        }
        if (!reduce) {
          s.y += s.drift;
          if (s.y < -4) s.y = height + 4;
          if (s.y > height + 4) s.y = -4;
        }
      });

      if (!reduce) {
        if (t - lastSpawn > 7000 + Math.random() * 6000) {
          lastSpawn = t;
          meteors.push({
            x: Math.random() * width * 0.8 + width * 0.1,
            y: Math.random() * height * 0.4,
            vx: 3.2 + Math.random() * 2.4,
            vy: 1.5 + Math.random() * 1.2,
            life: 1,
          });
        }
        meteors = meteors.filter(function (m) {
          m.x += m.vx * 2;
          m.y += m.vy * 2;
          m.life -= 0.014;
          if (m.life <= 0) return false;
          const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 22, m.y - m.vy * 22);
          grad.addColorStop(0, 'rgba(255, 248, 225, ' + (m.life * 0.9) + ')');
          grad.addColorStop(1, 'rgba(255, 248, 225, 0)');
          ctx.beginPath();
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.3;
          ctx.moveTo(m.x, m.y);
          ctx.lineTo(m.x - m.vx * 22, m.y - m.vy * 22);
          ctx.stroke();
          return true;
        });
        raf = requestAnimationFrame(draw);
      }
    }

    resize();
    window.addEventListener('resize', function () {
      cancelAnimationFrame(raf);
      resize();
      if (!reduce) raf = requestAnimationFrame(draw);
    });
  }

  /* ------------------------------------------------------------
     boot
     ------------------------------------------------------------ */

  $('#profileChip').addEventListener('click', function () {
    if (state.profile) location.hash = '#you';
    else openProfileModal();
  });

  // Pre-fill a sensible match based on the user's sun.
  (function seedMatch() {
    if (state.profile) {
      const sky = profileSky();
      if (sky) {
        state.matchA = sky.sunSign;
        state.matchB = ORDER[(ORDER.indexOf(sky.sunSign) + 4) % 12];
      }
    }
  })();

  initStars();
  render();
})();

