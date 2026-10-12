import { describe, expect, it } from 'vitest'
import type { Card } from './card'
import { fromPrinting, isPool, poolCards, poolNeeds, type Catalog } from './pools'

const card = (n: string, extra: Partial<Card> = {}): Card => ({ n, m: '', t: 'Instant', o: '', c: '', id: n, ...extra })

const top = [card('Sol Ring', { t: 'Artifact', g: '' }), card('Lightning Bolt', { g: 'm' }), card('Thoughtseize', { g: 'pm' })]
const rest = [
  card('Atraxa', { t: 'Legendary Creature — Phyrexian Angel' }),
  card('Rough', { full: 'Rough // Tumble', g: 'm', lay: 'split' }),
  card('Llanowar Elves', { g: 'spm', t: 'Creature — Elf Druid' }),
  card('Liliana of the Veil', { t: 'Legendary Planeswalker — Liliana', g: 'm' }),
]
const catalog: Catalog = {
  top,
  all: [...top, ...rest],
  staples: {
    updated: '2026-10-11',
    since: '2026-08-30',
    source: 'mtgo',
    formats: {
      standard: { events: 1, decks: 10, cards: ['Llanowar Elves'] },
      pioneer: { events: 1, decks: 10, cards: ['Thoughtseize'] },
      modern: { events: 1, decks: 10, cards: ['Lightning Bolt', 'Rough/Tumble', 'Not A Real Card'] },
    },
  },
  sets: { DSK: [card('Overlord of the Hauntwoods')] },
}

const names = (cards: Card[] | null) => cards?.map((c) => c.n)

describe('poolCards', () => {
  it('slices the EDHREC tiers from the top cards', () => {
    expect(names(poolCards(500, catalog))).toEqual(['Sol Ring', 'Lightning Bolt', 'Thoughtseize'])
    expect(poolCards(500, { ...catalog, top: Array.from({ length: 600 }, (_, i) => card(`c${i}`)) })).toHaveLength(500)
  })
  it('uses every card for Any card and QA', () => {
    expect(poolCards('all', catalog)).toHaveLength(7)
    expect(poolCards('qa', catalog)).toHaveLength(7)
  })
  it('picks legendary creatures from all of Magic', () => {
    expect(names(poolCards('legends', catalog))).toEqual(['Atraxa'])
  })
  it('picks every card legal in a format', () => {
    expect(names(poolCards('standard', catalog))).toEqual(['Llanowar Elves'])
    expect(names(poolCards('pioneer', catalog))).toEqual(['Thoughtseize', 'Llanowar Elves'])
    expect(poolCards('modern', catalog)).toHaveLength(5)
  })
  it('shows a format’s own printing in its pools, and the original-art printing elsewhere', () => {
    const elves = card('Llanowar Elves', {
      g: 'spm', id: 'sixth-edition', s: '6ED', cn: '239', a: 'Anson Maddocks', f: 'Old flavor',
      fp: { s: { id: 'foundations', s: 'FDN', cn: '227', ry: 'C', a: 'Kev Walker' } },
    })
    const cat = { ...catalog, all: [elves] }
    expect(poolCards('standard', cat)![0]).toMatchObject({ id: 'foundations', s: 'FDN', cn: '227', a: 'Kev Walker' })
    expect(poolCards('standard', cat)![0].f).toBeUndefined()
    expect(poolCards('pioneer', cat)![0]).toMatchObject({ id: 'sixth-edition', s: '6ED' })
    expect(poolCards('all', cat)![0]).toMatchObject({ id: 'sixth-edition', f: 'Old flavor' })
  })
  it('matches format staples to cards by name, including MTGO split-card names', () => {
    expect(names(poolCards('modern-staples', catalog))).toEqual(['Lightning Bolt', 'Rough'])
    expect(names(poolCards('standard-staples', catalog))).toEqual(['Llanowar Elves'])
  })
  it('uses a set’s own cards', () => {
    expect(names(poolCards('set:DSK', catalog))).toEqual(['Overlord of the Hauntwoods'])
  })
  it('returns null until the data a pool needs has loaded', () => {
    expect(poolCards('all', { ...catalog, all: null })).toBeNull()
    expect(poolCards('modern-staples', { ...catalog, staples: null })).toBeNull()
    expect(poolCards('set:MH3', catalog)).toBeNull()
    expect(poolCards(500, { ...catalog, all: null })).not.toBeNull()
  })
})

describe('poolNeeds', () => {
  it('says which data each pool needs', () => {
    expect(poolNeeds(2000)).toEqual({ all: false, staples: false, set: null })
    expect(poolNeeds('legends')).toEqual({ all: true, staples: false, set: null })
    expect(poolNeeds('pioneer-staples')).toEqual({ all: true, staples: true, set: null })
    expect(poolNeeds('set:DSK')).toEqual({ all: true, staples: false, set: 'DSK' })
  })
})

describe('isPool', () => {
  it('accepts every pool and rejects anything else', () => {
    for (const p of [500, 2000, 10000, 'all', 'legends', 'qa', 'standard', 'modern-staples', 'set:DSK', 'set:2X2']) expect(isPool(p)).toBe(true)
    for (const p of [3, 'pauper', 'set:', 'set:dsk!', null]) expect(isPool(p)).toBe(false)
  })
})

describe('fromPrinting', () => {
  it('uses a set printing’s id, number, rarity, flavor and artist with the catalog’s rules text', () => {
    const index = new Map([['llanowarelves', card('Llanowar Elves', { f: 'Old flavor', a: 'Old Artist', o: '{T}: Add {G}.' })]])
    const printing = { id: 'p1', name: 'Llanowar Elves', set: 'dom', collector_number: '168', rarity: 'common', flavor_text: 'New flavor', artist: 'New Artist' }
    expect(fromPrinting(printing, index)).toMatchObject({ n: 'Llanowar Elves', id: 'p1', s: 'DOM', cn: '168', ry: 'C', f: 'New flavor', a: 'New Artist', o: '{T}: Add {G}.' })
  })
  it('drops flavor the printing doesn’t have, and skips cards not in the catalog', () => {
    const index = new Map([['bolt', card('Bolt', { f: 'Old flavor' })]])
    expect(fromPrinting({ id: 'p', name: 'Bolt', set: 'x', collector_number: '1', rarity: 'common' }, index)?.f).toBeUndefined()
    expect(fromPrinting({ id: 'p', name: 'Plains', set: 'x', collector_number: '1', rarity: 'common' }, index)).toBeNull()
  })
})
