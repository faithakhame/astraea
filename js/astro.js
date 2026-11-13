/* ============================================================
   ASTRAEA — astronomy
   Sun & Moon ecliptic longitude, phase, illumination, moon sign,
   next phase events. Low-precision Meeus algorithms (accurate to
   well under a degree — plenty for sign-level reading).
   ============================================================ */
(function (global) {
  'use strict';

  const RAD = Math.PI / 180;
  const sin = (d) => Math.sin(d * RAD);
  const cos = (d) => Math.cos(d * RAD);
  const norm360 = (x) => ((x % 360) + 360) % 360;
  const norm180 = (x) => {
    let v = norm360(x);
    if (v > 180) v -= 360;
    return v;
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- time ---------- */

  // Julian Day from a JS Date (UTC-based).
  function toJD(date) {
    return date.getTime() / 86400000 + 2440587.5;
  }

  function fromJD(jd) {
    return new Date((jd - 2440587.5) * 86400000);
  }

  // Julian centuries since J2000.
  function centuries(jd) {
    return (jd - 2451545.0) / 36525;
  }

  function localNoon(date) {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);
    return d;
  }

  /* ---------- sun ---------- */

  function sunLongitude(jd) {
    const T = centuries(jd);
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    const C =
      (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) +
      (0.019993 - 0.000101 * T) * sin(2 * M) +
      0.000289 * sin(3 * M);
    return norm360(L0 + C);
  }

  /* ---------- moon ---------- */

  // Periodic terms of the Moon's longitude: [D, M, M', F, coeff(1e-6 deg)]
  const MOON_TERMS = [
    [0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027], [2, 0, 0, 0, 658314],
    [0, 0, 2, 0, 213618], [0, 1, 0, 0, -185116], [0, 0, 0, 2, -114332],
    [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066], [2, 0, 1, 0, 53322],
    [2, -1, 0, 0, 45758], [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720],
    [0, 1, 1, 0, -30383], [2, 0, 0, -2, 15327], [0, 0, 1, 2, -12528],
    [0, 0, 1, -2, 10980], [4, 0, -1, 0, 10675], [0, 0, 3, 0, 10034],
    [4, 0, -2, 0, 8548], [2, 1, -1, 0, -7888], [2, 1, 0, 0, -6766],
    [1, 0, -1, 0, -5163], [1, 1, 0, 0, 4987], [2, -1, 1, 0, 4036],
    [2, 0, 2, 0, 3994], [4, 0, 0, 0, 3861], [2, 0, -3, 0, 3665],
    [0, 1, -2, 0, -2689], [2, 0, -1, 2, -2602], [2, -1, -2, 0, 2390],
    [1, 0, 1, 0, -2348], [2, -2, 0, 0, 2236], [0, 1, 2, 0, -2120],
    [0, 2, 0, 0, -2069], [2, -2, -1, 0, 2048], [2, 0, 1, -2, -1773],
    [2, 0, 0, 2, -1595], [4, -1, -1, 0, 1215], [0, 0, 2, 2, -1110],
    [3, 0, -1, 0, -892], [2, 1, 1, 0, -810], [4, -1, -2, 0, 759],
    [0, 2, -1, 0, -713], [2, 2, -1, 0, -700], [2, 1, -2, 0, 691],
    [2, -1, 0, -2, 596], [4, 0, 1, 0, 549], [0, 0, 4, 0, 537],
    [4, -1, 0, 0, 520], [1, 0, -2, 0, -487], [2, 1, 0, -2, -399],
    [0, 0, 2, -2, -381], [1, 1, 1, 0, 351], [3, 0, -2, 0, -340],
    [4, 0, -3, 0, 330], [2, -1, 2, 0, 327], [0, 2, 1, 0, -323],
    [1, 1, -1, 0, 299], [2, 0, 3, 0, 294],
  ];

  function moonLongitude(jd) {
    const T = centuries(jd);
    const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + (T * T * T) / 538841 - (T * T * T * T) / 65194000;
    const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + (T * T * T) / 545868 - (T * T * T * T) / 113065000;
    const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + (T * T * T) / 24490000;
    const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + (T * T * T) / 69699 - (T * T * T * T) / 14712000;
    const F = 93.272095 + 483202.0175233 * T - 0.0036539 * T * T - (T * T * T) / 3526000 + (T * T * T * T) / 863310000;
    const A1 = 119.75 + 131.849 * T;
    const A2 = 53.09 + 479264.29 * T;
    const E = 1 - 0.002516 * T - 0.0000074 * T * T;

    let sum = 0;
    for (let i = 0; i < MOON_TERMS.length; i++) {
      const t = MOON_TERMS[i];
      let factor = 1;
      const m = Math.abs(t[1]);
      if (m === 1) factor = E;
      else if (m === 2) factor = E * E;
      sum += t[4] * sin(t[0] * D + t[1] * M + t[2] * Mp + t[3] * F) * factor;
    }
    sum += 3958 * sin(A1) + 1962 * sin(Lp - F) + 318 * sin(A2);
    return norm360(Lp + sum / 1e6);
  }

  /* ---------- phase ---------- */

  // Elongation of the Moon from the Sun, 0..360 (0 = new, 180 = full).
  function elongation(jd) {
    return norm360(moonLongitude(jd) - sunLongitude(jd));
  }

  // Illuminated fraction of the disc, 0..1.
  function illumination(jd) {
    return (1 - cos(elongation(jd))) / 2;
  }

  // Phase angle: 0 = new, 90 = first quarter, 180 = full, 270 = last quarter.
  function phaseAngle(jd) {
    return elongation(jd);
  }

  function isWaxing(jd) {
    return elongation(jd) < 180;
  }

  const PHASES = [
    { id: 'new', name: 'New Moon', glyph: '🌑', short: 'New' },
    { id: 'waxing-crescent', name: 'Waxing Crescent', glyph: '🌒', short: 'Crescent' },
    { id: 'first-quarter', name: 'First Quarter', glyph: '🌓', short: 'First Qtr' },
    { id: 'waxing-gibbous', name: 'Waxing Gibbous', glyph: '🌔', short: 'Gibbous' },
    { id: 'full', name: 'Full Moon', glyph: '🌕', short: 'Full' },
    { id: 'waning-gibbous', name: 'Waning Gibbous', glyph: '🌖', short: 'Dissem.' },
    { id: 'last-quarter', name: 'Last Quarter', glyph: '🌗', short: 'Last Qtr' },
    { id: 'waning-crescent', name: 'Waning Crescent', glyph: '🌘', short: 'Balsamic' },
  ];

  function phaseInfo(jd) {
    const angle = elongation(jd);
    const index = Math.floor(((angle + 22.5) % 360) / 45); // 45° sectors centred on each phase
    const phase = PHASES[index];
    return {
      angle,
      index,
      id: phase.id,
      name: phase.name,
      glyph: phase.glyph,
      short: phase.short,
      illumination: (1 - cos(angle)) / 2,
      waxing: angle < 180,
    };
  }

  /* ---------- zodiac ---------- */

  const SIGN_IDS = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
  ];

  function signIndex(lon) {
    return Math.floor(norm360(lon) / 30) % 12;
  }

  function signId(lon) {
    return SIGN_IDS[signIndex(lon)];
  }

  // Degree within the sign, e.g. 14.3
  function degreeInSign(lon) {
    return norm360(lon) % 30;
  }

  function formatDegree(lon) {
    const deg = degreeInSign(lon);
    const d = Math.floor(deg);
    const m = Math.floor((deg - d) * 60);
    return `${d}° ${String(m).padStart(2, '0')}'`;
  }

  /* ---------- sun sign from a birth date ---------- */

  // First day of each sign, by calendar month (index 0 = January).
  const SIGN_STARTS = [
    { m: 0, d: 20, s: 'aquarius' }, { m: 1, d: 19, s: 'pisces' },
    { m: 2, d: 21, s: 'aries' }, { m: 3, d: 20, s: 'taurus' },
    { m: 4, d: 21, s: 'gemini' }, { m: 5, d: 21, s: 'cancer' },
    { m: 6, d: 23, s: 'leo' }, { m: 7, d: 23, s: 'virgo' },
    { m: 8, d: 23, s: 'libra' }, { m: 9, d: 23, s: 'scorpio' },
    { m: 10, d: 22, s: 'sagittarius' }, { m: 11, d: 22, s: 'capricorn' },
  ];

  function sunSignFromDate(date) {
    const m = date.getMonth();
    const d = date.getDate();
    const start = SIGN_STARTS[m];
    if (d >= start.d) return start.s;
    // Before this month's cusp we are still in the previous sign.
    const idx = SIGN_IDS.indexOf(start.s);
    return SIGN_IDS[(idx + 11) % 12];
  }

  /* ---------- upcoming phase events ---------- */

  function findPhaseEvent(startJD, targetAngle) {
    const target = norm360(targetAngle);
    const offset = (jd) => norm180(elongation(jd) - target);

    const step = 0.25; // days
    let t0 = startJD;
    let f0 = offset(t0);

    // If we are essentially sitting on the event, move past it so we find the next.
    if (Math.abs(f0) < 0.02) {
      t0 += 0.5;
      f0 = offset(t0);
    }

    for (let i = 0; i < 480; i++) {
      const t1 = t0 + step;
      const f1 = offset(t1);
      if (f0 < 0 && f1 >= 0) {
        let lo = t0;
        let hi = t1;
        for (let k = 0; k < 48; k++) {
          const mid = (lo + hi) / 2;
          if (offset(mid) < 0) lo = mid;
          else hi = mid;
        }
        return (lo + hi) / 2;
      }
      t0 = t1;
      f0 = f1;
    }
    return null;
  }

  function nextEvents(fromDate, count) {
    const start = toJD(fromDate);
    const targets = [
      { angle: 0, name: 'New Moon', glyph: '🌑', kind: 'new' },
      { angle: 90, name: 'First Quarter', glyph: '🌓', kind: 'quarter' },
      { angle: 180, name: 'Full Moon', glyph: '🌕', kind: 'full' },
      { angle: 270, name: 'Last Quarter', glyph: '🌗', kind: 'quarter' },
    ];
    const events = [];
    for (const t of targets) {
      let cursor = start;
      for (let n = 0; n < 3; n++) {
        const jd = findPhaseEvent(cursor, t.angle);
        if (!jd) break;
        events.push({
          jd,
          date: fromJD(jd),
          kind: t.kind,
          name: t.name,
          glyph: t.glyph,
          sign: signId(moonLongitude(jd)),
          signDegree: formatDegree(moonLongitude(jd)),
        });
        cursor = jd + 1;
      }
    }
    events.sort((a, b) => a.jd - b.jd);
    return events.slice(0, count || 6);
  }

  /* ---------- lunar month helpers ---------- */

  // Synodic month (new moon to new moon), used for progress arcs.
  const SYNODIC = 29.530588853;

  function daysIntoCycle(jd) {
    const angle = elongation(jd);
    return (angle / 360) * SYNODIC;
  }

  function ageOfMoon(jd) {
    return daysIntoCycle(jd);
  }

  /* ---------- birth sky ---------- */

  function birthSky(date) {
    const jd = toJD(date);
    const lon = moonLongitude(jd);
    const info = phaseInfo(jd);
    return {
      jd,
      sunSign: sunSignFromDate(date),
      sunLongitude: sunLongitude(jd),
      moonSign: signId(lon),
      moonLongitude: lon,
      moonDegree: formatDegree(lon),
      phase: info,
      age: ageOfMoon(jd),
    };
  }

  /* ---------- misc ---------- */

  function formatDate(date, opts) {
    return date.toLocaleDateString(undefined, opts || { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function formatTime(date) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  function daysBetween(a, b) {
    return Math.round((b - a) / 86400000);
  }

  global.Astro = {
    RAD, norm360, norm180, clamp,
    toJD, fromJD, centuries, localNoon,
    sunLongitude, moonLongitude, elongation, illumination, phaseAngle, isWaxing,
    PHASES, phaseInfo, SIGN_IDS, signIndex, signId, degreeInSign, formatDegree,
    sunSignFromDate, nextEvents, findPhaseEvent, SYNODIC, daysIntoCycle, ageOfMoon,
    birthSky, formatDate, formatTime, daysBetween,
  };
})(window);
