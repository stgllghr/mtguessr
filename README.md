# MTGuessr

**Play it at [mtguessr.vercel.app](https://mtguessr.vercel.app).**

A fan-made, endless Magic: The Gathering card-guessing game, based on
**[Spellify](https://edhrec.com/games/spellify) by [EDHREC](https://edhrec.com)**. Go play their
daily puzzle too! MTGuessr turns it into an endless run: you get a card with every word on it
blanked out, guess letters, numbers and mana symbols to fill in the blanks, then name the card
before your 13 tries run out. Solve it and the next card comes up; miss one and the run is over.

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
| `npm run staples:update` | Rebuild the staples, check them, then commit and push |

## Deploy

It's a static Vite site plus one tiny function, hosted on [Vercel](https://vercel.com):

1. In Vercel, choose *Add New → Project* and import this GitHub repo. `vercel.json` sets the
   build, so just press **Deploy**. Every push to `main` redeploys.
2. For weekly card updates, in the project's **Settings**:
   - **Git → Deploy Hooks:** create a hook for the `main` branch and copy its URL.
   - **Environment Variables:** add `DEPLOY_HOOK_URL` (that URL) and `CRON_SECRET` (any long
     random string, e.g. from `openssl rand -hex 32`). Then redeploy once so the cron job sees
     them.

## Keeping the data fresh

- **Cards update themselves every week.** A Vercel cron job (Mondays, 9:00 UTC) calls
  `/api/refresh`, which starts a fresh deploy. Each deploy downloads Scryfall's latest bulk files
  (an official download, not scraping) and rebuilds the card data, so new sets, rules changes and
  EDHREC ranks show up within a week. If the download fails or the new data looks wrong, the
  deploy uses the card data committed in the repo instead.
- **Format staples are refreshed from your own computer.** They're read from mtgo.com, and
  GitHub's and Vercel's terms don't allow scraping from their servers. Run this whenever you
  want an update (it takes about 15 minutes); it checks the new list, then commits and pushes,
  which redeploys the site:

  ```bash
  npm run staples:update
  ```

- The game's footer shows when the card data and staples were last updated.

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

- **Game idea:** [Spellify](https://edhrec.com/games/spellify) by [EDHREC](https://edhrec.com).
  MTGuessr is an independent fan project and isn't affiliated with EDHREC.
- **Card data and images:** [Scryfall](https://scryfall.com) (not affiliated).
- **Commander popularity:** [EDHREC](https://edhrec.com).
- **Format staples:** [Magic Online tournament results](https://www.mtgo.com/decklists).
- **Mana symbols:** [Mana](https://mana.andrewgioia.com) by Andrew Gioia.

The code is under the [MIT License](LICENSE). Card text, names, images and other Magic: The
Gathering materials are not covered by it.

MTGuessr is unofficial Fan Content permitted under the
[Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy). Not
approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the
Coast. ©Wizards of the Coast LLC.
