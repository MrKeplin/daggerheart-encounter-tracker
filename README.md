# Daggerheart Encounter Tracker

A browser-based encounter tracker for [Daggerheart](https://www.daggerheart.com/) tabletop RPG sessions. Run combats from a single HTML page—track adversary HP and stress, manage fear and action tokens, advance rounds, and browse a built-in adversary database from the Companion / SRD.

No server or build step is required. Open the tracker in any modern browser and start your encounter.

## Features

- Adversary cards with HP, stress, and defeat tracking
- Fear and action token counters
- Round tracker with undo support
- Searchable adversary library (Tier 1 content included)
- Save / load encounter state via export codes
- Dark, session-friendly UI

## Download and install

### Option 1 — Download a release (recommended)

1. Go to **[Releases](https://github.com/MrKeplin/daggerheart-encounter-tracker/releases)** and open the latest version.
2. Download **Source code (zip)** under Assets.
3. Extract the ZIP to a folder on your computer.
4. Open **`daggerheart-encounter-tracker.html`** in Chrome, Edge, or Firefox.

The release ZIP contains only the files needed to run the app—nothing extra.

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

## Phones and tablets

The tracker runs in mobile browsers (Safari on iPhone/iPad, Chrome on Android, etc.) with a responsive layout for smaller screens. **An update focused on phones and tablets is coming soon** — expect improved touch controls and layout refinements.

## Project structure

| File | Purpose |
|------|---------|
| `daggerheart-encounter-tracker.html` | Main app — open this in a browser |
| `tracker-logic.js` | Core encounter logic |
| `adversaries.js` | Adversary stat database |
| `adversaries-enrich.js` | Extended adversary metadata |

## License note

Adversary data is derived from Daggerheart Companion / SRD material. This project is an unofficial fan tool and is not affiliated with or endorsed by Daggerheart's publishers.
