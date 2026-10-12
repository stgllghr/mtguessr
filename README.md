# Spellify Endless

A fan-made, endless take on EDHREC's [Spellify](https://edhrec.com/games/spellify). You get a
Magic: The Gathering card with every word on it blanked out. Guess letters, numbers and mana
symbols to fill in the blanks, then name the card before your 13 tries run out. Solve it and the
next card comes up; miss one and the run is over.

## How it plays

- **Every guess costs a try:** letters, numbers, mana symbols, and naming the card.
- **Everything printed is hidden:** name, mana cost, type line, rules text, flavor text, stats,
  artist and the set line at the bottom left. Normal mode shows the frame color; **hard mode**
  hides that too.
- **Real card layouts:** planeswalkers, sagas, classes, adventures, prepared spells, split and
  aftermath cards, flip cards, battles and double-faced cards put their blanks where the text is
  printed. **Rotate** the card or **check its other side** like a real one.
- **Art hints (experimental):** for 3 tries, reveal a small square of the art, up to 4 times,
  working in from the edge.
- **Card text is always the current Oracle wording**, so it can differ from the printed card
  shown at the end, especially on older cards.
- Best streaks are kept for each pool and mode, and a run in progress survives a page reload.
  Everything is stored in your browser; there are no accounts.

### Card pools

| Group | Pools |
|---|---|
| Commander | Top 500, 2,000 or 10,000 cards by EDHREC popularity |
| Standard, Pioneer, Modern | The format's staples (most-played in recent Magic Online tournaments), or any legal card |
| All of Magic | Any card (about 32,000), or every legendary creature |
| One set | Any set, loaded live from Scryfall |

## Run it locally

Needs Node 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:5173. Other commands:

| Command | What it does |
|---|---|
| `npm test` | Run the unit tests |
| `npm run build` | Type-check and build the static site into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run cards` | Rebuild the card data from Scryfall (downloads about 105 MB) |
| `npm run staples` | Rebuild the format staples from Magic Online results (about 15 minutes) |

## Deploy

It's a static Vite site with no server, so any static host works. On
[Vercel](https://vercel.com): import the GitHub repo (*Add New → Project*) and deploy; Vercel
detects Vite on its own (build `npm run build`, output `dist`). Or from a terminal: `npx vercel`.

## How the data works

- **Cards** (`public/cards-top.json`, `public/cards-rest.json`) are a snapshot of Scryfall's
  bulk data: every real, printed card (no tokens, joke cards or digital-only cards). Each card
  shows its **original art**, on the newest printing that kept it. Standard, Pioneer and Modern
  pools show the newest printing from a set in that format instead. Rules text is always Oracle
  wording.
- **Staples** (`public/staples.json`) are counted from the last six weeks of Magic Online
  Challenges and Leagues: a card is a staple if it's in at least 1% of decks.
- **One-set pools** fetch the set's cards from the Scryfall API when you pick the set, so they
  need a connection. Card images always come from Scryfall.

The game logic lives in `src/game/` (plain TypeScript with unit tests) and the interface in
`src/ui/`. Design notes are in `docs/`.

### QA mode

Add `?qa` to the address for a hidden **QA: special frames** pool. It takes turns through every
special card frame, with **Reveal** and **Skip** buttons, for checking layouts against the real
cards.

## Credits

Card data and images from [Scryfall](https://scryfall.com). Commander popularity from
[EDHREC](https://edhrec.com). Format staples from
[Magic Online tournament results](https://www.mtgo.com/decklists). Mana symbols from
[Mana](https://mana.andrewgioia.com) by Andrew Gioia. Inspired by EDHREC's
[Spellify](https://edhrec.com/games/spellify). Not affiliated with EDHREC or Scryfall.

Spellify Endless is unofficial Fan Content permitted under the
[Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy). Not
approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the
Coast. ©Wizards of the Coast LLC.
