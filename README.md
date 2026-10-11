# Spellify Endless

An endless version of EDHREC's [Spellify](https://edhrec.com/games/spellify). A Magic card is
shown with every piece of text hidden. Guess letters, numbers and mana symbols to fill in the
blanks, then name the card. Every guess costs one of 13 tries. Solve cards to build a streak; one
miss ends the run.

- **Card pools:** Top 500 / 2,000 / 10,000 Commander cards by EDHREC rank, or **Any card** from
  the full catalog (about 32,000 cards, picked uniformly at random).
- **Hard mode:** also hides the frame color.
- Best streaks are kept per pool and mode. Your run in progress survives a page reload.

## Play locally

Needs Node 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. For a production build served locally: `npm run build && npm run preview`.

## Refresh the card data

The card lists are committed in `public/` (`cards-top.json`, `cards-rest.json`). To rebuild them
from Scryfall's latest Oracle Cards bulk file (about 25 MB download):

```bash
npm run cards
```

You can also pass a local copy: `node scripts/build-cards.mjs path/to/oracle-cards.jsonl.gz`.

## Deploy to Vercel

It's a static Vite site, so there's no configuration to write.

- **From GitHub:** push this repo, then in Vercel choose *Add New → Project*, import the repo, and
  deploy. Vercel detects Vite (build `npm run build`, output `dist`).
- **From the terminal:** `npx vercel` for a preview deploy, `npx vercel --prod` for production.

## Tests

```bash
npm test
```

Game logic lives in `src/game/` (pure TypeScript, unit-tested). The UI is in `src/ui/`. Design
notes are in `docs/superpowers/`.

Card data and images come from [Scryfall](https://scryfall.com). Popularity comes from
[EDHREC](https://edhrec.com). Not affiliated with EDHREC or Wizards of the Coast.
