// One card's puzzle: the masked view and the guesses made against it.
import { normalizeName, type Card } from './card'
import { isRevealed, keysIn, tokenize, type Token } from './tokens'

export const MAX_TRIES = 13

export type CardView = {
  name: Token[]
  cost: Token[]
  types: Token[]
  text: Token[]
  flavor: Token[]
  stats: Token[] | null
  artist: Token[]
}

export type Guess = { type: 'key'; key: string; hit: boolean } | { type: 'name'; text: string; hit: boolean }
export type CardGame = { guesses: Guess[]; status: 'playing' | 'won' | 'lost' }

function statsText(card: Card): string | null {
  if (card.p !== undefined && card.th !== undefined) return `${card.p}/${card.th}`
  return card.l ?? card.d ?? null
}

export function buildView(card: Card): CardView {
  const stats = statsText(card)
  return {
    name: tokenize(card.n),
    cost: tokenize(card.m),
    types: tokenize(card.t),
    text: tokenize(card.o),
    flavor: tokenize(card.f ?? ''),
    stats: stats === null ? null : tokenize(stats),
    artist: tokenize(card.a ?? ''),
  }
}

const allTokens = (v: CardView) => [...v.name, ...v.cost, ...v.types, ...v.text, ...v.flavor, ...(v.stats ?? []), ...v.artist]

export const newCardGame = (): CardGame => ({ guesses: [], status: 'playing' })

export const triesLeft = (game: CardGame) => MAX_TRIES - game.guesses.length

export function guessedKeys(game: CardGame): Set<string> {
  return new Set(game.guesses.flatMap((g) => (g.type === 'key' ? [g.key] : [])))
}

function settle(game: CardGame, won: boolean): CardGame {
  if (won) return { ...game, status: 'won' }
  return triesLeft(game) <= 0 ? { ...game, status: 'lost' } : game
}

export function guessKey(view: CardView, game: CardGame, key: string): CardGame {
  if (game.status !== 'playing' || guessedKeys(game).has(key)) return game
  const hit = keysIn(allTokens(view)).has(key)
  const next: CardGame = { ...game, guesses: [...game.guesses, { type: 'key', key, hit }] }
  const guessed = guessedKeys(next)
  return settle(next, view.name.every((t) => isRevealed(t, guessed)))
}

export function guessName(card: Card, game: CardGame, text: string): CardGame {
  const answer = normalizeName(text)
  if (game.status !== 'playing' || !answer) return game
  const hit = answer === normalizeName(card.n) || (card.full !== undefined && answer === normalizeName(card.full))
  const next: CardGame = { ...game, guesses: [...game.guesses, { type: 'name', text: text.trim(), hit }] }
  return settle(next, hit)
}
