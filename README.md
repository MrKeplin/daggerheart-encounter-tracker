# Daggerheart Encounter Tracker

A browser-based encounter tracker for [Daggerheart](https://www.daggerheart.com/) tabletop RPG sessions. Run combats from a single HTML page—track adversary HP and stress, manage fear and action tokens, advance rounds, and browse a built-in adversary database from the Companion / SRD.

No server or build step is required to play. Open the tracker in any modern browser and start your encounter.

## Features

- Adversary cards with HP, stress, and defeat tracking
- Fear and action token counters
- Round tracker with undo support
- Searchable adversary library (Tier 1 content included)
- Save / load encounter state via export codes
- Dark, session-friendly UI

## Download and install

### Option 1 — Download a ZIP (quickest)

1. Go to the repository on GitHub:  
   **https://github.com/MrKeplin/daggerheart-encounter-tracker**
2. Click **Code** → **Download ZIP**.
3. Extract the ZIP to a folder on your computer (e.g. `Documents\daggerheart-encounter-tracker`).
4. Open **`daggerheart-encounter-tracker.html`** in Chrome, Edge, or Firefox.

That’s it—you’re ready to run encounters.

### Option 2 — Clone with Git

If you have [Git](https://git-scm.com/download/win) installed:

```powershell
git clone https://github.com/MrKeplin/daggerheart-encounter-tracker.git
cd daggerheart-encounter-tracker
```

Then open **`daggerheart-encounter-tracker.html`** in your browser.

To get updates later:

```powershell
git pull
```

## Optional: developer setup

Only needed if you want to run tests or rebuild the adversary database from source data.

**Requirements:** [Node.js](https://nodejs.org/) (LTS recommended)

```powershell
cd daggerheart-encounter-tracker
npm test              # run unit tests
npm run build:db      # rebuild adversaries.js from tier1-companion-source.txt
```

## Project structure

| File | Purpose |
|------|---------|
| `daggerheart-encounter-tracker.html` | Main app—open this in a browser |
| `tracker-logic.js` | Core encounter logic |
| `adversaries.js` | Adversary stat database |
| `adversaries-enrich.js` | Extended adversary metadata |
| `package.json` | npm scripts for tests and database build |

## License note

Adversary data is derived from Daggerheart Companion / SRD material. This project is an unofficial fan tool and is not affiliated with or endorsed by Daggerheart’s publishers.
