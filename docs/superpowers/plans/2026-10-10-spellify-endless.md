# Spellify Endless Implementation Plan

> The game was renamed **MTGuessr** before its public release; these notes keep the working name.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static web app that plays endless Spellify (guess the hidden MTG card) with streaks, difficulty tiers and hard mode.

**Architecture:** A build script snapshots Scryfall Oracle Cards → `public/cards.json`. A pure TypeScript engine (`src/game/`) turns a card into tokens, applies guesses and manages the run. React components (`src/ui/`) render the card, keyboard and dialogs. No server.

**Tech Stack:** Vite 8, React 19, TypeScript, Vitest, mana-font.

**Spec:** `docs/superpowers/specs/2026-10-10-spellify-endless-design.md`

## Global Constraints

- 13 tries per card; every guess (key or name) costs one.
- Pools: 500 / 2000 / 10000 by EDHREC rank, or `'all'` (top + rest, uniform random). Best streak keyed by `pool × mode`.
- Every text element on the card is hidden in both modes (name, cost, full type line, rules, flavor, stats, artist). Hard mode additionally replaces the frame color with one neutral frame.
- Guess keys are strings: `A`–`Z`, `0`–`9`, `+`, `-`, `*`, and symbol keys
  `{W} {U} {B} {R} {G} {W/P} {U/P} {B/P} {R/P} {G/P} {C} {T} {Q} {E} {S}`.
- `−` (U+2212) matches `-`. Accents fold to base letters.
- All localStorage access wrapped in try/catch.

---

### Task 1: Scaffold + card data

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`
- Create: `scripts/build-cards.mjs` (exports `isRealCard(raw)`, `isTopEligible(raw)`, `toCompact(raw)`, `imageUrl(id)`; CLI `node scripts/build-cards.mjs [local.jsonl.gz]`)
- Create: `public/cards-top.json`, `public/cards-rest.json` (generated, committed)
- Test: `scripts/build-cards.test.mjs`

**Interfaces — Produces:**
```ts
type Card = { n: string; full?: string; m: string; t: string; o: string; f?: string; a?: string;
  p?: string; th?: string; l?: string; d?: string; c: string; r?: number; id: string };
```
`c` = front-face colors joined (e.g. `"WU"`, `""` colorless). `cards-top.json` = top 10,000 Commander-legal by `r`; `cards-rest.json` = all other real cards.
Image URL: `https://cards.scryfall.io/normal/front/${id[0]}/${id[1]}/${id}.jpg`.

- [ ] Write tests: normal card maps all fields incl. flavor + artist; transform card uses face 0 text and sets `full`; `isRealCard` rejects token, art_series, funny, alchemy, arena-only, basic land, `_`-containing; keeps an mtgo-only paper card; `isTopEligible` needs commander-legal + rank.
- [ ] Run → fail. Implement. Run → pass.
- [ ] Generate both files from the downloaded bulk file; check top count = 10000, total ≈ 31k, sizes.
- [ ] Commit.

### Task 2: Tokenizer (`src/game/tokens.ts`)

**Interfaces — Produces:**
```ts
type Token =
  | { kind: 'char'; ch: string; key: string | null }      // key null = always visible
  | { kind: 'sym'; sym: string; keys: string[]; all: boolean } // all=true → every key needed
  | { kind: 'nl' };
function charKey(ch: string): string | null;
function symbolKeys(sym: string): { keys: string[]; all: boolean };
function tokenize(text: string, visible?: boolean): Token[];
function isRevealed(t: Token, guessed: ReadonlySet<string>): boolean;
```

- [ ] Tests: `charKey('a')='A'`, `'û'→'U'`, `'7'→'7'`, `'−'→'-'`, `','→null`, `' '→null`;
  `symbolKeys('{G}')` → `['{G}']`; `'{10}'` → `['1','0'], all`; `'{X}'` → `['X']`;
  `'{W/U}'` → `['{W}','{U}']` any; `'{2/B}'` → `['2','{B}']`; `'{G/W/P}'` → `['{G/P}','{W/P}']`;
  `'{P}'` → five Phyrexian keys; `'{HW}'` → `[]`.
  `tokenize('{T}: Add {G}.\nHi')` gives sym, chars, sym, char '.', nl, chars.
  `tokenize('Creature', true)` → all keys null. `isRevealed` any/all semantics; empty keys always revealed.
- [ ] Run → fail. Implement. Run → pass. Commit.

### Task 3: Card view + per-card game (`src/game/cardGame.ts`)

**Interfaces — Consumes:** `Card`, `Token`, `tokenize`, `isRevealed`.
**Produces:**
```ts
const MAX_TRIES = 13;
type CardView = { name: Token[]; cost: Token[]; types: Token[]; text: Token[]; flavor: Token[]; stats: Token[] | null; artist: Token[] };
type Guess = { type: 'key'; key: string; hit: boolean } | { type: 'name'; text: string; hit: boolean };
type CardGame = { guesses: Guess[]; status: 'playing' | 'won' | 'lost' };
function buildView(card: Card): CardView;   // hard mode only affects the frame, not the view
function guessedKeys(game: CardGame): Set<string>;
function newCardGame(): CardGame;
function guessKey(view: CardView, game: CardGame, key: string): CardGame;
function guessName(card: Card, game: CardGame, text: string): CardGame;
function triesLeft(game: CardGame): number;
function normalizeName(s: string): string;
function edhrecUrl(card: Card): string;
```

- [ ] Tests: type line `Legendary Creature — Elf Druid` → letters hidden, `—` visible; flavor + artist hidden and revealed by keys; stats `p/th` with `/` visible, loyalty, none for non-creatures;
  key hit vs miss; repeated key is a no-op; each guess decrements tries; 13th miss → lost; revealing all name chars → won;
  name guess ignores case/accents/punctuation, accepts `full`; wrong name costs a try; no guesses after win/loss;
  `edhrecUrl` for `Atraxa, Praetors' Voice` → `https://edhrec.com/cards/atraxa-praetors-voice`.
- [ ] Run → fail. Implement. Run → pass. Commit.

### Task 4: Run state + storage (`src/game/run.ts`, `src/game/storage.ts`)

**Produces:**
```ts
type Pool = 500 | 2000 | 10000 | 'all';
type Settings = { pool: Pool; hard: boolean };
type Run = { settings: Settings; seed: number; index: number; streak: number; game: CardGame };
function shuffleOrder(n: number, seed: number): number[];       // deterministic
function startRun(settings: Settings, seed: number): Run;
function currentCard(run: Run, cards: Card[]): Card;
function poolSize(pool: Pool, cards: Card[]): number;  // cards = top (+ rest when 'all')
function applyGuess(run: Run, cards: Card[], g: { key: string } | { name: string }): Run; // streak+1 on win
function nextCard(run: Run): Run;                                 // only after win; wraps with new seed
function bestKey(s: Settings): string;                            // `${pool}:${hard?'hard':'normal'}`
// storage.ts
function load<T>(key: string, fallback: T): T; function save(key: string, v: unknown): void;
```

- [ ] Tests: shuffle is a permutation and deterministic per seed; currentCard draws within the pool; win increments streak; nextCard resets game and advances; wrap past pool end; storage survives a throwing localStorage.
- [ ] Run → fail. Implement. Run → pass. Commit.

### Task 5: UI

**Files:** `src/App.tsx`, `src/ui/StartScreen.tsx`, `src/ui/CardFace.tsx`, `src/ui/GuessBar.tsx`, `src/ui/Keyboard.tsx`, `src/ui/NameGuess.tsx`, `src/ui/EndOfCard.tsx`, `src/ui/Sym.tsx`, `src/styles.css`

- [ ] StartScreen: pool picker (Top 500 / 2,000 / 10,000 / Any card), hard toggle, best streak, Play, resume run if one is saved.
- [ ] CardFace: frame by color (W/U/B/R/G/gold/artifact/land; hard → neutral), name + cost row, blank art, type bar, text box (rules + italic flavor), stats box, artist line. Lazy-load `cards-rest.json` when pool is `'all'`. Hidden char = underscore slot; hidden symbol = blank circle; words don't break.
- [ ] GuessBar: 13 segments showing used guesses (hit/miss). Keyboard: ABC and 123/symbol layers, per-key hit/miss/disabled, physical keys + Enter.
- [ ] NameGuess: modal with autocomplete (prefix matches first, max 8). EndOfCard: Scryfall image, EDHREC + Scryfall links, Next / Play again.
- [ ] Persist run, settings, best streaks.
- [ ] Commit.

### Task 6: Verify + docs

- [ ] `npm test`, `npm run build` clean.
- [ ] Run dev server via preview; play a card to win and to loss in normal + hard; check phone width.
- [ ] README: play locally, refresh card data, deploy to Vercel. Commit.
