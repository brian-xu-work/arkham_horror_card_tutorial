# Learn to Play Arkham Horror: The Card Game

An interactive, static tutorial that teaches someone how to play *Arkham Horror: The Card Game* from
setup to their first full round. No rulebook required.

It walks through the game step by step, drops small interactive toys at the points that actually
matter (the chaos bag, skill tests), and finishes with a playable round where you spend Roland
Banks's actions yourself.

![Preview](assets/img/hero.jpg)

## What's inside

- **18 numbered steps**, split into Setup, The Round, and Finishing, with a scroll-spy contents
  rail and a progress bar.
- **A full setup walkthrough** with exact values: 30-card starter decks, 5 starting resources,
  a 5-card opening hand, the real 16-token Standard chaos bag, and health/sanity per investigator.
  A tick-off checklist persists your progress.
- **Interactive chaos bag** you can draw from, with the Standard token distribution.
- **Skill-test builder**: set a skill value and difficulty, commit cards, reveal a chaos token,
  and watch the math resolve live. Ties succeed.
- **Four-phase round stepper**: Mythos, Investigation, Enemy, Upkeep.
- **Card-type flip cards** for assets, events, skills, and weaknesses.
- **Engage / fight / evade demo** with a live enemy.
- **A playable round simulator**: Roland Banks in the Study with four connected locations, a
  working hand of assets, events, and skills, an encounter deck, an enemy phase, upkeep, and a
  doom clock. Advance the Act before the Agenda fills to win. It is winnable and losable.
- **A scored quiz** with an explanation for every answer.

Everything is progressive-enhancement friendly, keyboard accessible, and reduced-motion aware.
Lighthouse scores are 100 for accessibility, best practices, and SEO.

## Quick start

Requires Node 18 or newer (built with Node 24).

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build into dist/
npm run preview  # serve the production build locally
```

The site uses ES modules, so it must be served over HTTP. Opening `index.html` directly from the
filesystem will not work; use the dev server, `npm run preview`, or a static host.

## Deploying to Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. Framework preset: **Vite** (auto-detected). Build command `npm run build`, output directory `dist`.
3. Deploy.

## Analytics

Uses the official [`@vercel/analytics`](https://www.npmjs.com/package/@vercel/analytics) package.
`js/main.js` calls `inject()`, which loads the Vercel insights script in production. Analytics only
collects on Vercel deployments, and never in development mode.

Custom events are sent with `track()`:

| Event | Fired when | Properties |
| --- | --- | --- |
| `setup_completed` | every box in the setup checklist is ticked | none |
| `quiz_completed` | the quiz reaches its results screen | `score`, `total` |
| `sim_round_won` | the playable round advances the Act | `round` |
| `sim_round_lost` | the investigator is defeated in the playable round | `round`, `reason` |

Enable **Web Analytics** for the project in the Vercel dashboard to start collecting.

## Project structure

```
index.html              all content and markup
css/styles.css          design system and components
js/main.js              entry point: calls inject() and imports the modules below
js/app.js               nav, scroll-spy, reveal animations, phase tabs, checklist, playthrough, combat demo
js/chaos-bag.js         chaos bag widget and the skill-test builder
js/simulator.js         the playable round engine
js/quiz.js              scored quiz
vite.config.js          Vite build config
scripts/fetch-assets.sh downloads the public-domain imagery
assets/img/             images (public domain, see CREDITS.md)
CREDITS.md              image sources and licenses
```

## Regenerating the images

All imagery is public domain and is downloaded from Wikimedia Commons. If you clone the repo and
the images are missing, or you want to re-fetch them:

```bash
./scripts/fetch-assets.sh          # skip files that already exist
./scripts/fetch-assets.sh --force  # re-download everything
```

On macOS the script also downscales and recompresses the images with `sips`. On other systems it
just downloads them. Every image sits on a CSS gradient, so the layout still holds up if a file is
missing. See [CREDITS.md](CREDITS.md) for the full list of sources and licenses.

## Customizing

- **Colors and type** live as CSS variables at the top of `css/styles.css` (`--gold`, `--green`,
  `--ink`, the font stacks, radii, and layout widths).
- **Game content** is plain HTML in `index.html`. The simulator's cards, locations, and encounters
  are small data arrays at the top of `js/simulator.js`, so you can retune the scenario without
  touching the engine.
- **Chaos bag** tokens are defined in `js/chaos-bag.js`.

## Tech

Plain HTML, CSS, and vanilla JavaScript, bundled with [Vite](https://vitejs.dev/). The only runtime
dependency is `@vercel/analytics`. Fonts are Cinzel and EB Garamond via Google Fonts.

## Credits and license

Unofficial, non-commercial fan project. *Arkham Horror: The Card Game* and all related names and
terminology are trademarks of Fantasy Flight Games. No game components or card art are reproduced;
the rules are described in the author's own words for teaching purposes.

All images are public domain, sourced from Wikimedia Commons. See [CREDITS.md](CREDITS.md).
