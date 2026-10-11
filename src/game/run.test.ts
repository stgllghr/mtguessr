import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Card } from './card'
import { applyGuess, bestKey, currentCard, isRun, nextCard, poolSize, recordBest, shuffleOrder, startRun, type Run } from './run'
import { load, save } from './storage'

const cards: Card[] = Array.from({ length: 30 }, (_, i) => ({ n: `Card ${String.fromCharCode(65 + (i % 26))}${i}`, m: '', t: 'Instant', o: '', c: '', id: `id${i}` }))

describe('shuffleOrder', () => {
  it('is a deterministic permutation', () => {
    const a = shuffleOrder(30, 42)
    expect([...a].sort((x, y) => x - y)).toEqual(Array.from({ length: 30 }, (_, i) => i))
    expect(shuffleOrder(30, 42)).toEqual(a)
    expect(shuffleOrder(30, 43)).not.toEqual(a)
  })
})

describe('runs', () => {
  const settings = { pool: 500 as const, hard: false }

  it('caps the pool at the available cards; "all" uses everything', () => {
    expect(poolSize(500, cards)).toBe(30)
    expect(poolSize('all', cards)).toBe(30)
    expect(poolSize(10 as never, cards)).toBe(10)
  })

  it('draws only from within a small pool', () => {
    const names = new Set<string>()
    for (let seed = 0; seed < 50; seed++) names.add(currentCard(startRun({ pool: 10 as never, hard: false }, seed), cards).n)
    for (const n of names) expect(cards.slice(0, 10).map((c) => c.n)).toContain(n)
  })

  it('increments the streak on a win and advances to a fresh card', () => {
    const run = startRun(settings, 7)
    const card = currentCard(run, cards)
    const won = applyGuess(run, cards, { name: card.n })
    expect(won.game.status).toBe('won')
    expect(won.streak).toBe(1)
    const next = nextCard(won, cards)
    expect(next.index).toBe(1)
    expect(next.game.guesses).toEqual([])
    expect(next.streak).toBe(1)
    expect(currentCard(next, cards).n).not.toBe(card.n)
  })

  it('does not advance unless the card was won', () => {
    const run = startRun(settings, 7)
    expect(nextCard(run, cards)).toBe(run)
  })

  it('does not change the streak on a loss', () => {
    let run = startRun(settings, 7)
    for (let i = 0; i < 13; i++) run = applyGuess(run, cards, { name: `nope ${i}` })
    expect(run.game.status).toBe('lost')
    expect(run.streak).toBe(0)
  })

  it('reshuffles after the last card in the pool', () => {
    let run: Run = { ...startRun(settings, 7), index: 29 }
    run = applyGuess(run, cards, { name: currentCard(run, cards).n })
    const next = nextCard(run, cards)
    expect(next.index).toBe(0)
    expect(next.seed).not.toBe(7)
  })

  it('keys and records best streaks per pool and mode', () => {
    expect(bestKey({ pool: 2000, hard: true })).toBe('2000:hard')
    expect(bestKey({ pool: 'all', hard: false })).toBe('all:normal')
    const run = { ...startRun(settings, 1), streak: 4 }
    expect(recordBest({ '500:normal': 2 }, run)).toEqual({ '500:normal': 4 })
    expect(recordBest({ '500:normal': 9 }, run)).toEqual({ '500:normal': 9 })
  })

  it('validates stored runs', () => {
    expect(isRun(startRun(settings, 1))).toBe(true)
    expect(isRun(null)).toBe(false)
    expect(isRun({ settings: { pool: 3, hard: false }, seed: 1, index: 0, streak: 0, game: { guesses: [], status: 'playing' } })).toBe(false)
  })
})

describe('storage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('round-trips JSON', () => {
    const mem = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v) })
    save('k', { a: 1 })
    expect(load('k', null)).toEqual({ a: 1 })
  })

  it('falls back when storage throws or holds junk', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    expect(load('k', 5)).toBe(5)
    expect(() => save('k', 1)).not.toThrow()
    vi.stubGlobal('localStorage', { getItem: () => '{not json', setItem: () => {} })
    expect(load('k', 5)).toBe(5)
  })
})
