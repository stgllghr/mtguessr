// One card's puzzle: the masked view of every face and the guesses made against it.
import { ART_HINT_COST, MAX_ART_HINTS } from './artHints'
import { answerName, facesOf, normalizeName, type Card, type Face, type Layout } from './card'
import { isRevealed, keysIn, tokenize, type Token } from './tokens'

export const MAX_TRIES = 13

export type FaceKind = 'standard' | 'planeswalker' | 'saga' | 'class' | 'battle'

/** A block of rules text. Loyalty abilities and class levels carry a hidden badge (the cost
 * or level cost) drawn apart from the text. Saga chapters list their numerals, which are
 * always shown: one icon each, beside text they share ("II, III — …"). */
export type Section = {
  kind: 'plain' | 'loyalty' | 'chapter' | 'level'
  badge: Token[] | null
  chapters?: string[]
  tokens: Token[]
}

export type FaceView = {
  face: Face
  kind: FaceKind
  name: Token[]
  cost: Token[]
  types: Token[]
  sections: Section[]
  flavor: Token[]
  stats: Token[] | null
  artist: Token[]
}

/** The printed line at the bottom left: rarity letter, collector number and set code. */
export type InfoLine = { rarity: Token[]; number: Token[]; set: Token[] }

export type CardView = { layout: Layout; faces: FaceView[]; answer: Token[]; info: InfoLine | null }

export type Guess =
  | { type: 'key'; key: string; hit: boolean }
  | { type: 'name'; text: string; hit: boolean }
  | { type: 'art'; hit: true } // an art hint: reveals a patch of the art, costs ART_HINT_COST tries
export type CardGame = { guesses: Guess[]; status: 'playing' | 'won' | 'lost' }

function kindOf(face: Face): FaceKind {
  if (/\bPlaneswalker\b/.test(face.t)) return 'planeswalker'
  if (/\bSaga\b/.test(face.t)) return 'saga'
  if (/\bClass\b/.test(face.t)) return 'class'
  if (/\bBattle\b/.test(face.t)) return 'battle'
  return 'standard'
}

const LOYALTY = /^([+−-]?(?:\d+|X)): (.+)$/s
const CHAPTER = /^([IVX]+(?:, [IVX]+)*) — (.+)$/s
const LEVEL = /^((?:\{[^}]+\})+): (Level \d+)$/

function sectionsOf(text: string, kind: FaceKind): Section[] {
  if (!text) return []
  return text.split('\n').map((line): Section => {
    const pattern = kind === 'planeswalker' ? LOYALTY : kind === 'saga' ? CHAPTER : kind === 'class' ? LEVEL : null
    const m = pattern?.exec(line)
    if (!m) return { kind: 'plain', badge: null, tokens: tokenize(line) }
    if (kind === 'saga') return { kind: 'chapter', badge: null, chapters: m[1].split(', '), tokens: tokenize(m[2]) }
    return { kind: kind === 'planeswalker' ? 'loyalty' : 'level', badge: tokenize(m[1]), tokens: tokenize(m[2]) }
  })
}

function statsText(face: Face): string | null {
  if (face.p !== undefined && face.th !== undefined) return `${face.p}/${face.th}`
  return face.l ?? face.d ?? null
}

function buildFace(face: Face): FaceView {
  const kind = kindOf(face)
  const stats = statsText(face)
  return {
    face,
    kind,
    name: tokenize(face.n),
    cost: tokenize(face.m),
    types: tokenize(face.t),
    sections: sectionsOf(face.o, kind),
    flavor: tokenize(face.f ?? ''),
    stats: stats === null ? null : tokenize(stats),
    artist: tokenize(face.a ?? ''),
  }
}

function infoLine(card: Card): InfoLine | null {
  if (!card.s) return null
  // Modern cards print the collector number with leading zeros: 221 → 0221.
  const number = card.cn && /^\d+$/.test(card.cn) ? card.cn.padStart(4, '0') : (card.cn ?? '')
  return { rarity: tokenize(card.ry ?? ''), number: tokenize(number), set: tokenize(card.s) }
}

export function buildView(card: Card): CardView {
  return {
    layout: card.lay ?? 'normal',
    faces: facesOf(card).map(buildFace),
    answer: tokenize(answerName(card)),
    info: infoLine(card),
  }
}

const infoTokens = (info: InfoLine | null) => (info ? [...info.rarity, ...info.number, ...info.set] : [])

export function faceTokens(f: FaceView): Token[] {
  const sections = f.sections.flatMap((s) => [...(s.badge ?? []), ...s.tokens])
  return [...f.name, ...f.cost, ...f.types, ...sections, ...f.flavor, ...(f.stats ?? []), ...f.artist]
}

export const newCardGame = (): CardGame => ({ guesses: [], status: 'playing' })

/** How many of the 13 tries a guess uses. */
export const guessCost = (g: Guess) => (g.type === 'art' ? ART_HINT_COST : 1)

export const triesLeft = (game: CardGame) => MAX_TRIES - game.guesses.reduce((n, g) => n + guessCost(g), 0)

export const artHints = (game: CardGame) => game.guesses.filter((g) => g.type === 'art').length

/** An art hint is offered while it still leaves at least one try to name the card. */
export const canUseArtHint = (game: CardGame) =>
  game.status === 'playing' && artHints(game) < MAX_ART_HINTS && triesLeft(game) > ART_HINT_COST

export function guessArt(game: CardGame): CardGame {
  return canUseArtHint(game) ? { ...game, guesses: [...game.guesses, { type: 'art', hit: true }] } : game
}

export function guessedKeys(game: CardGame): Set<string> {
  return new Set(game.guesses.flatMap((g) => (g.type === 'key' ? [g.key] : [])))
}

function settle(game: CardGame, won: boolean): CardGame {
  if (won) return { ...game, status: 'won' }
  return triesLeft(game) <= 0 ? { ...game, status: 'lost' } : game
}

export function guessKey(view: CardView, game: CardGame, key: string): CardGame {
  if (game.status !== 'playing' || guessedKeys(game).has(key)) return game
  const hit = keysIn([...view.faces.flatMap(faceTokens), ...infoTokens(view.info)]).has(key)
  const next: CardGame = { ...game, guesses: [...game.guesses, { type: 'key', key, hit }] }
  const guessed = guessedKeys(next)
  return settle(next, view.answer.every((t) => isRevealed(t, guessed)))
}

export function guessName(card: Card, game: CardGame, text: string): CardGame {
  const answer = normalizeName(text)
  if (game.status !== 'playing' || !answer) return game
  const hit = answer === normalizeName(answerName(card))
  const next: CardGame = { ...game, guesses: [...game.guesses, { type: 'name', text: text.trim(), hit }] }
  return settle(next, hit)
}
