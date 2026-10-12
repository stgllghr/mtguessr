import { describe, expect, it } from 'vitest'
import { formatSetCodes, isEligiblePrinting, pickFormatPrinting, pickOriginalArtPrinting } from './printings.mjs'

const p = (over) => ({
  id: over.id,
  oracle_id: 'elves',
  set: 'lea',
  set_type: 'core',
  released_at: '1993-08-05',
  collector_number: '1',
  rarity: 'common',
  games: ['paper'],
  digital: false,
  promo: false,
  oversized: false,
  lang: 'en',
  illustration_id: 'anson',
  ...over,
})

describe('isEligiblePrinting', () => {
  it('keeps normal paper printings', () => {
    expect(isEligiblePrinting(p({ id: 'a' }))).toBe(true)
  })
  it('skips promos, digital-only, oversized, joke and variant-frame printings', () => {
    expect(isEligiblePrinting(p({ id: 'a', promo: true }))).toBe(false)
    expect(isEligiblePrinting(p({ id: 'a', digital: true, games: ['arena'] }))).toBe(false)
    expect(isEligiblePrinting(p({ id: 'a', oversized: true }))).toBe(false)
    expect(isEligiblePrinting(p({ id: 'a', set_type: 'funny' }))).toBe(false)
    expect(isEligiblePrinting(p({ id: 'a', frame_effects: ['showcase'] }))).toBe(false)
    expect(isEligiblePrinting(p({ id: 'a', border_color: 'borderless' }))).toBe(false)
  })
})

describe('pickOriginalArtPrinting', () => {
  const printings = [
    p({ id: 'alpha', set: 'lea', released_at: '1993-08-05', illustration_id: 'anson' }),
    p({ id: 'revised', set: '3ed', released_at: '1994-04-11', illustration_id: 'anson' }),
    p({ id: 'promo', set: 'p30', released_at: '1999-01-01', illustration_id: 'anson', promo: true }),
    p({ id: 'm19', set: 'm19', released_at: '2018-07-13', illustration_id: 'kev' }),
    p({ id: 'fdn', set: 'fdn', released_at: '2024-11-15', illustration_id: 'kev' }),
  ]
  it('uses the newest printing that kept the first printing’s art', () => {
    expect(pickOriginalArtPrinting(printings).id).toBe('revised')
  })
  it('ignores promos when finding the first printing', () => {
    const withEarlyPromo = [p({ id: 'early-promo', released_at: '1990-01-01', illustration_id: 'promo-art', promo: true }), ...printings]
    expect(pickOriginalArtPrinting(withEarlyPromo).id).toBe('revised')
  })
  it('falls back to any printing when none qualify', () => {
    expect(pickOriginalArtPrinting([p({ id: 'only', promo: true })]).id).toBe('only')
  })
})

describe('formatSetCodes', () => {
  it('finds the sets whose cards are all legal in a format', () => {
    const legal = { elves: { standard: 'not_legal', modern: 'legal' }, bolt: { standard: 'legal', modern: 'legal' } }
    const printings = [
      p({ id: '1', set: 'm19', set_type: 'core', oracle_id: 'elves' }),
      p({ id: '2', set: 'fdn', set_type: 'core', oracle_id: 'bolt' }),
      p({ id: '3', set: 'a25', set_type: 'masters', oracle_id: 'bolt' }),
    ]
    const sets = formatSetCodes(printings, legal)
    expect([...sets.standard]).toEqual(['fdn'])
    expect([...sets.modern].sort()).toEqual(['fdn', 'm19'])
  })
})

describe('pickFormatPrinting', () => {
  it('uses the newest eligible printing from a set in the format', () => {
    const printings = [
      p({ id: 'm19', set: 'm19', released_at: '2018-07-13' }),
      p({ id: 'fdn', set: 'fdn', released_at: '2024-11-15' }),
      p({ id: 'fdn-showcase', set: 'fdn', released_at: '2024-11-15', frame_effects: ['showcase'] }),
      p({ id: 'cmm', set: 'cmm', released_at: '2023-08-04' }),
    ]
    expect(pickFormatPrinting(printings, new Set(['m19', 'fdn'])).id).toBe('fdn')
    expect(pickFormatPrinting(printings, new Set(['xyz']))).toBeNull()
  })
})
