# Miori's Spell Garden

A Chromebook-first spelling practice game for Miori.

## Live site

GitHub Pages: https://nagaitashouten-star.github.io/miori-spell-garden/

GitHub Pages publishes from the `gh-pages` branch. `main` remains the working branch; when the app is updated, the finished `main` commit is mirrored to `gh-pages` for publication.

## Product structure

- **Garden** — a single-screen reward space with XP, plant growth, collectible friends/items, and drag-and-drop layout.
- **Play** — four adaptive stages: Listen & Choose, Fill the Gap, Type the Gap, Full Spelling.
- **Parent** — weekly list, Word Library, Word Pack import/export, pronunciation preview, preferred device voice, and per-word learning data.

## Repository structure

- `index.html` — app shell
- `app-parts/` + `app-loader.js` — spelling engine and app logic
- `stage3-fix.js` / `stage4-fix.js` — focused visual Hint behavior
- `cute-items.js` — collectible Garden artwork layer
- `style-parts/` + `styles-bundle.css` — UI styles
- `manifest.webmanifest` / `sw.js` — PWA support, written to work under the GitHub Pages project path
- `word-pack-sept-17-unit-5a.json` — bundled school Word Pack reference
- `.nojekyll` — publishes the static files directly on GitHub Pages

Netlify-specific repository configuration has been removed. GitHub Pages is the primary publication path.

## Data

Progress is stored locally in the browser under `miori_spell_garden_v1`. Export a Backup from Parent before clearing browser data or changing Chromebook profiles.

Existing words can be updated without erasing their learning history. Adaptive weak spelling selection prioritizes Miori's recorded spelling, then Play mistakes, then phonics focus, then a normal fallback gap.

## Pronunciation

When a playable human pronunciation URL is available, normal playback uses it first. Otherwise the selected English device voice is used. Slow Hint pronunciation uses the device voice for reliable Chromebook playback.

## Bundled first week

The initial build includes **Sept 17 · Unit 5A** from Miori's school sheet. The English meanings are preserved as supplied. Future weeks can be replaced from Parent → Import Word Pack.
