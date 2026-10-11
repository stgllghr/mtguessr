// An endless run: a seeded shuffle of the pool, the current card's game, and the streak.
import type { Card } from './card'
import { buildView, guessKey, guessName, newCardGame, type CardGame } from './cardGame'

export const POOLS = [500, 2000, 10000, 'all'] as const
export type Pool = (typeof POOLS)[number]
export type Settings = { pool: Pool; hard: boolean }
export type Run = { settings: Settings; seed: number; index: number; streak: number; game: CardGame }
export type Bests = Record<string, number>

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let cachedOrder: { n: number; seed: number; order: number[] } | null = null

export function shuffleOrder(n: number, seed: number): number[] {
  if (cachedOrder && cachedOrder.n === n && cachedOrder.seed === seed) return cachedOrder.order
  const order = Array.from({ length: n }, (_, i) => i)
  const rand = mulberry32(seed)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  cachedOrder = { n, seed, order }
  return order
}

export const poolSize = (pool: Pool, cards: Card[]) => (pool === 'all' ? cards.length : Math.min(pool, cards.length))

export const newSeed = () => Math.floor(Math.random() * 2 ** 31)

export const startRun = (settings: Settings, seed: number): Run => ({ settings, seed, index: 0, streak: 0, game: newCardGame() })

export function currentCard(run: Run, cards: Card[]): Card {
  return cards[shuffleOrder(poolSize(run.settings.pool, cards), run.seed)[run.index]]
}

export function applyGuess(run: Run, cards: Card[], guess: { key: string } | { name: string }): Run {
  const card = currentCard(run, cards)
  const game = 'key' in guess ? guessKey(buildView(card), run.game, guess.key) : guessName(card, run.game, guess.name)
  if (game === run.game) return run
  const justWon = run.game.status === 'playing' && game.status === 'won'
  return { ...run, game, streak: justWon ? run.streak + 1 : run.streak }
}

export function nextCard(run: Run, cards: Card[]): Run {
  if (run.game.status !== 'won') return run
  const atEnd = run.index + 1 >= poolSize(run.settings.pool, cards)
  return {
    ...run,
    seed: atEnd ? (run.seed + 1) >>> 0 : run.seed,
    index: atEnd ? 0 : run.index + 1,
    game: newCardGame(),
  }
}

export const bestKey = (s: Settings) => `${s.pool}:${s.hard ? 'hard' : 'normal'}`

export function recordBest(bests: Bests, run: Run): Bests {
  const key = bestKey(run.settings)
  return run.streak > (bests[key] ?? 0) ? { ...bests, [key]: run.streak } : bests
}

export function isRun(x: unknown): x is Run {
  const r = x as Run
  return (
    !!r &&
    typeof r === 'object' &&
    POOLS.includes(r.settings?.pool) &&
    typeof r.settings.hard === 'boolean' &&
    Number.isInteger(r.seed) &&
    Number.isInteger(r.index) &&
    Number.isInteger(r.streak) &&
    Array.isArray(r.game?.guesses) &&
    ['playing', 'won', 'lost'].includes(r.game.status)
  )
}
