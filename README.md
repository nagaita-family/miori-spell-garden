# Miori's Spell Garden

A completely new spelling-learning web app built from scratch for Chromebook keyboard use.

## Product structure

- **Garden** — a single-screen reward space. XP, plant growth, unlockable friends/items, and drag-and-drop layout.
- **Play** — one simple entry point with four adaptive stages: Listen & Choose, Fill the Gap, Type the Gap, Full Spelling.
- **Parent** — weekly list, Word Library, Word Pack import/export, pronunciation preview, preferred device voice, and per-word learning data.

No Focus Water, Quick Review, Bonus Sun, Weekly Challenge, Growth Journey, or Daily Story progression.

## Data

All progress is stored in the browser's `localStorage` under `miori_spell_garden_v1`. Export Backup from Parent before clearing browser data or moving to another Chromebook profile.

Existing words are updated without erasing their learning history. `mioriSpelling` is the first source used to choose weak spelling spans; then actual Play mistakes; then `phonicsFocus`; then a normal middle gap.

## Pronunciation

If `pronunciationUrl` is present, normal pronunciation uses that human audio. Otherwise the selected English device voice is used. Slow Hint pronunciation always uses the device voice at a slower rate so it works reliably on Chromebook.

## Netlify

This is a no-build static site. Publish directory is the repository root (`.`). `netlify.toml` is included.

## Bundled first week

The initial build includes **Sept 17 · Unit 5A** from Miori's school sheet. The English meanings are preserved exactly as written on the supplied sheet. Future weeks can be replaced from Parent → Import Word Pack.
