# Spellify Endless — Design

An endless-mode clone of EDHREC's Spellify (https://edhrec.com/games/spellify).
Static web app, playable locally, deployable to Vercel with zero config.

## Gameplay

- **Start screen:** title, card pool picker — Top 500 / Top 2,000 / Top 10,000 by
  EDHREC rank (Commander-legal), or **Any card** (uniformly random from the full
  catalog, no ranking) — Hard mode toggle, best streak for the selected settings, **Play**.
- **A card** is drawn from the shuffled pool (no repeats within a run). Each card gets
  **13 tries**; every guess costs one: letter, digit, symbol, or full-name guess.
- **Guessing a key** reveals every matching hidden character across the name, type
  line, rules text, flavor text, mana cost, P/T/loyalty/defense and artist.
- **Name guess** ("Guess card…") opens a text box with autocomplete over all card
  names. Match ignores case, accents and punctuation. For multi-face cards the front
  face name or the full `A // B` name both count.
- **Win** a card when the name guess is right or every hidden character of the name
  has been revealed. **Lose** when tries hit 0 without a win.
- **End of card:** show the real Scryfall card image and a link to its EDHREC page.
  (Plus a Scryfall link, since not every Any-card pick has an EDHREC page.)
  Win → "Next card" (streak +1). Lose → "Run over", streak shown, best streak saved,
  "Play again".
- **Physical keyboard:** letters, digits, `+ - *` guess; Enter opens the name guess.

## What is hidden

| Element | Normal | Hard |
|---|---|---|
| Frame color | real card color (W/U/B/R/G, gold multi, artifact grey, land brown) | one neutral frame |
| Name, mana cost, whole type line, rules text, flavor text, P/T/loyalty/defense, artist | hidden | hidden |
| Art | blank | blank |
| Spaces, punctuation, `—`, `/` in P/T, newlines | visible | visible |

Hidden characters render as one underscore slot each, so word lengths show.

## Guess keys

- Letters A–Z (accented letters fold to their base letter).
- Digits 0–9, `+`, `-` (also matches `−` U+2212), `*`.
- Symbol layer: `{W} {U} {B} {R} {G}`, Phyrexian `{W/P} {U/P} {B/P} {R/P} {G/P}`,
  `{C} {T} {Q} {E} {S}`.

Mana symbol reveal rules:
- Colored/colorless/tap/untap/energy/snow: revealed by its own key.
- Generic `{N}`: revealed when every digit of N has been guessed. `{X}` by letter X.
- Hybrid `{W/U}`, `{2/B}`, `{C/W}`: revealed when **any** component has been guessed.
- Phyrexian `{G/P}`, `{G/W/P}`: revealed by any matching Phyrexian key;
  bare `{P}` by any Phyrexian key.
- Unknown symbols are shown revealed (never block a win).

## Data

`scripts/build-cards.mjs` downloads Scryfall's Oracle Cards bulk file (or reads a
local copy) and keeps real cards: excludes tokens, emblems, art series, planes,
schemes, vanguards, Jumpstart front cards, Un-set (`funny`), memorabilia, minigame
and Alchemy cards, arena-only printings, basic lands, and anything with a `_`
placeholder. Multi-face cards use face 0 for text; image is the card's front.

- `public/cards-top.json`: Commander-legal cards with an `edhrec_rank`, sorted by
  rank, top 10,000. Loaded at startup; Top-N pools slice it.
- `public/cards-rest.json`: every other kept card. Fetched only for **Any card**,
  whose pool is top + rest.

Compact card: `{ n, full?, m, t, o, f?, a?, p?, th?, l?, d?, c, r?, id }` —
name, full name if different, mana cost, type line, oracle text, flavor text,
artist, power, toughness, loyalty, defense, frame colors (e.g. `"WU"`), EDHREC rank,
Scryfall id (image URL is derived from it).

## Persistence (localStorage)

- Settings (pool, hard mode).
- Best streak per `pool × mode`.
- Current run (seed, card index, guesses, status) so refresh neither resets nor rerolls.

## Architecture

- `src/game/` — pure TypeScript, no DOM: tokenizer (text → chars + symbols),
  masking, guess application, name matching, run state reducer, seeded shuffle.
  Unit-tested with Vitest.
- `src/ui/` — React components: StartScreen, CardView, GuessBar, Keyboard (two
  layers), NameGuessDialog, EndOfCard.
- Mana symbol icons from the `mana-font` package.
- Stack: Vite + React + TypeScript. `npm run dev` locally; Vercel auto-detects Vite.

## Out of scope

Accounts, daily puzzle, sharing results, a server/API.

## Card layouts (added 2026-10-11)

Every face is kept; guesses are shared across all faces. Blanks sit where the text is
printed for each layout. The correct answer is the **main name** only: the front face
(DFCs, flip), the creature (adventure, prepared), or both halves `A // B` (split,
aftermath). Revealing every letter of the main name also wins.

| Layout | Drawn as |
|---|---|
| Planeswalker | Loyalty abilities as rows with a neutral cost badge (sign hidden, so the badge shape never hints + or −); starting loyalty in the bottom-right shield |
| Saga | Chapter text in a left column with roman-numeral markers; tall art on the right |
| Class | Tall art on the left; text on the right split by level bars (cost · Level N) |
| Adventure | Adventure panel (name, cost, type, text) on the left of the text box; creature text on the right |
| Prepared | Mirror of adventure: creature text left, spell panel right |
| Split | Two halves printed sideways (rotated −90°), each with its own frame color |
| Aftermath | Top half upright; bottom half sideways (rotated +90°) |
| Flip | Top half upright; second half upside down below the art |
| Battle | Landscape frame printed sideways |
| Double-faced (transform, MDFC) | Back face has its own blanks and frame color |

Card controls, always visible during play:
- **Rotate** turns the whole card 90° at a time, blanks and all, like turning a real card.
- **Check other side** flips the card. Double-faced cards show the back face's blanks;
  every other card shows a plain card back (our own design, not Wizards' art).

When a card ends, each side's blanks fill in and then dissolve into the real Scryfall
image (front image; back image for double-faced cards).
