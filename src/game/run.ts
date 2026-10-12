// An endless run: a seeded shuffle of the pool's cards, the current card's game, and the streak.
// Every function takes `cards`: the pool's card list (see pools.ts).
import type { Card } from './card'
import { buildView, guessKey, guessName, newCardGame, type CardGame } from './cardGame'
import { isPool, type Pool } from './pools'
import { qaCategory, qaOrder } from './qa'
import { seededShuffle } from './random'

export type { Pool }

export type Settings = { pool: Pool; hard: boolean; setName?: string }
export type Run = { settings: Settings; seed: number; index: number; streak: number; game: CardGame }
export type Bests = Record<string, number>

let cachedOrder: { key: string; order: number[] } | null = null

function cached(key: string, build: () => number[]): number[] {
  if (cachedOrder?.key !== key) cachedOrder = { key, order: build() }
  return cachedOrder.order
}

export function shuffleOrder(n: number, seed: number): number[] {
  return cached(`${n}:${seed}`, () =>
    seededShuffle(
      Array.from({ length: n }, (_, i) => i),
      seed,
    ),
  )
}

function orderFor(pool: Pool, cards: Card[], seed: number): number[] {
  if (pool === 'qa') return cached(`qa:${cards.length}:${seed}`, () => qaOrder(cards, seed))
  return shuffleOrder(cards.length, seed)
}

/** How many cards a run of this pool goes through before reshuffling. */
export function poolSize(pool: Pool, cards: Card[]): number {
  return pool === 'qa' ? cards.filter(qaCategory).length : cards.length
}

export const newSeed = () => Math.floor(Math.random() * 2 ** 31)

export const startRun = (settings: Settings, seed: number): Run => ({ settings, seed, index: 0, streak: 0, game: newCardGame() })

export function currentCard(run: Run, cards: Card[]): Card {
  return cards[orderFor(run.settings.pool, cards, run.seed)[run.index]]
}

export function applyGuess(run: Run, cards: Card[], guess: { key: string } | { name: string }): Run {
  const card = currentCard(run, cards)
  const game = 'key' in guess ? guessKey(buildView(card), run.game, guess.key) : guessName(card, run.game, guess.name)
  if (game === run.game) return run
  const justWon = run.game.status === 'playing' && game.status === 'won'
  return { ...run, game, streak: justWon ? run.streak + 1 : run.streak }
}

/** Moves on to the next card, reshuffling after the last card in the pool. */
export function skipCard(run: Run, cards: Card[]): Run {
  const atEnd = run.index + 1 >= poolSize(run.settings.pool, cards)
  return {
    ...run,
    seed: atEnd ? (run.seed + 1) >>> 0 : run.seed,
    index: atEnd ? 0 : run.index + 1,
    game: newCardGame(),
  }
}

/** The next card of a run, once the current one is solved. */
export function nextCard(run: Run, cards: Card[]): Run {
  return run.game.status === 'won' ? skipCard(run, cards) : run
}

/** QA: end the current card and show its answer, without using up tries. */
export function revealCard(run: Run): Run {
  return run.game.status === 'playing' ? { ...run, game: { ...run.game, status: 'lost' } } : run
}

export const bestKey = (s: Settings) => `${s.pool}:${s.hard ? 'hard' : 'normal'}`

export function recordBest(bests: Bests, run: Run): Bests {
  if (run.settings.pool === 'qa') return bests
  const key = bestKey(run.settings)
  return run.streak > (bests[key] ?? 0) ? { ...bests, [key]: run.streak } : bests
}

export function isRun(x: unknown): x is Run {
  const r = x as Run
  return (
    !!r &&
    typeof r === 'object' &&
    isPool(r.settings?.pool) &&
    typeof r.settings.hard === 'boolean' &&
    Number.isInteger(r.seed) &&
    Number.isInteger(r.index) &&
    Number.isInteger(r.streak) &&
    Array.isArray(r.game?.guesses) &&
    ['playing', 'won', 'lost'].includes(r.game.status)
  )
}
