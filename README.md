# Astraea ☾

A celestial self-reflection app: daily astrology readings, birth-chart snapshots, partner compatibility, life-path guidance, live moon tracking, rituals, and a private journal.

Astraea is a fully static, zero-runtime-dependency web app. No framework, no build step, no accounts, no network calls for your data. Everything you enter stays in your browser.

---

## Run it

```bash
npm start
```

Then open **http://localhost:4173**.

`npm start` runs a tiny built-in static server (`server.js`) with no dependencies, so there is nothing to install. Any static file server works too — for example:

```bash
npx serve .
# or
python -m http.server 4173
```

> If you open `index.html` directly from disk, some browsers block local scripts. Use a local server instead.

---

## What's inside

| View | What it does |
| --- | --- |
| **Today** | A reading for your sun sign: energy, love, career, money, and wellbeing notes, plus lucky colour, number, hour, crystal, herb, and day ruler. Moon weather, season and “ruler of the day” panels. |
| **Your Chart** | Enter a birth date and time to see your sun sign, moon sign, birth phase, and a drawn chart wheel. Saved locally so the app greets you by name. |
| **Compatibility** | Pick two signs for an element-based match score, strengths, friction points, and a shared ritual. |
| **Life Paths** | Five tabbed readings: **Advice**, **Career**, **Love**, **Money**, and **Relocation** (with destination suggestions tuned to your sign). |
| **Moon** | A live canvas moon with real phase and illumination, the next new/full moon dates, and a month-by-month phase calendar. Tap any day to read its moon sign and mood. |
| **Rituals** | New moon, full moon, beauty/glamour, money-attraction, and a shelf of smaller rituals, each with a materials list, steps, and the best time to perform it. |
| **Journal** | Private entries tied to the current moon phase. Stored in `localStorage`; export or clear whenever you like. |

### Design

- Dark celestial palette (ink, gold, violet), Cormorant Garamond display type, Inter for UI.
- Animated canvas starfield, aurora gradients, and a hand-drawn moon that reflects the actual lunar cycle.
- Responsive from small phones to wide desktops, with reduced-motion support.

---

## How the astronomy works

`js/astro.js` computes the sky instead of faking it:

- Sun and moon ecliptic longitude using truncated Meeus algorithms.
- Moon phase angle, illumination fraction, and waxing/waning state.
- Upcoming new and full moon events found by scanning and refining phase angle.
- Moon sign from the moon's ecliptic longitude.
- A birth snapshot (sun sign, moon sign, phase) for the date and time you enter.

The **astronomy is real; the interpretations are poetic**. Sign readings, compatibility scores, and ritual guidance are reflective, symbolic content — not predictions, and not medical, legal, or financial advice.

Daily readings are deterministic: the same sign on the same date always produces the same reading, seeded from the sign and date. That keeps the experience coherent if you revisit it during the day.

---

## Privacy

- No backend, no analytics, no tracking, no third-party requests except Google Fonts.
- Your profile and journal live in `localStorage` under:
  - `astraea.profile.v1`
  - `astraea.journal.v1`
- Clearing site data removes them. The Journal view has an export button so you can keep a copy.

---

## Project layout

```
index.html            App shell, navigation, modal, script order
css/styles.css        Design system, layout, responsive rules, motion
js/astro.js           Astronomy engine + Astro API
js/data-signs.js      12 signs: copy, colours, crystals, symbols
js/data-daily.js      Daily pools, moon weather, birth phases, destinations
js/data-rituals.js    Ritual library and phase guidance
js/app.js             Router, views, interactions, state, canvas rendering
server.js             Zero-dependency static server (port 4173)
test/smoke.js         Optional headless smoke test (jsdom)
```

---

## Optional: tests

The smoke test boots the app in jsdom, visits every view and tab, exercises the journal, profile, compatibility, chart, and calendar, and asserts there are no runtime errors.

```bash
npm install   # installs jsdom (dev-only)
npm test
```

You can also open the app and use it directly; tests are not required to run it.

---

## Notes & limits

- Moon calculations are accurate to a fraction of a degree for most dates, but this is a lightweight engine — not an ephemeris for research or navigation.
- Sun-sign cusps are handled by date, not birth time. For a precise sun sign near a cusp, use the birth-chart input with a time.
- Country flags are intentionally replaced with thematic glyphs because flag emoji do not render on every platform.
- The app is entertainment and self-reflection. It is not a substitute for professional advice.

Made for clear nights and curious minds. ✦
