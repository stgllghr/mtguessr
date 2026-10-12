# Spellify Endless

An endless version of EDHREC's [Spellify](https://edhrec.com/games/spellify). A Magic card is
shown with every piece of text hidden. Guess letters, numbers and mana symbols to fill in the
blanks, then name the card. Every guess costs one of 13 tries. Solve cards to build a streak; one
miss ends the run.

- **Card pools:**
  - **Commander:** Top 500 / 2,000 / 10,000 by EDHREC rank.
  - **Standard, Pioneer, Modern:** the format's staples (most-played in recent Magic Online
    tournaments), or any legal card.
  - **All of Magic:** any card (about 32,000), or every legendary creature.
  - **One set:** pick any set; its cards come live from Scryfall.
- **Set line:** the rarity, collector number and set code at the bottom left are blanks too.
- **Hard mode:** also hides the frame color.
- **Real card layouts:** planeswalkers, sagas, classes, adventures, prepared spells, split and
  aftermath cards, flip cards, battles and double-faced cards put their blanks where the text is
  printed. Rotate the card or check its other side like a real one.
- Best streaks are kept per pool and mode. Your run in progress survives a page reload.

## Play locally

Needs Node 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. For a production build served locally: `npm run build && npm run preview`.

## Refresh the format staples

`public/staples.json` holds the most-played Standard, Pioneer and Modern cards, counted from
the last six weeks of Magic Online Challenges and Leagues on mtgo.com (a card is a staple if
it's in at least 1% of decks). To update it (takes about 15 minutes; the site is slow):

```bash
npm run staples
```

## QA mode

Add `?qa` to the address (for example http://localhost:5173/?qa) and a **QA: special frames**
pool appears on the start screen. It takes turns through every special card frame
(adventure, prepared, split, battle, MDFC, aftermath, transform, flip, saga, class,
planeswalker), with **Reveal** to compare against the real card and **Skip** to move on.
Nothing in QA counts toward best streaks.

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
