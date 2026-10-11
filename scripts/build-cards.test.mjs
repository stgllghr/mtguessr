import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { isRealCard, isTopEligible, toCompact } from './build-cards.mjs'

const sample = JSON.parse(readFileSync(new URL('./fixtures/scryfall-sample.json', import.meta.url), 'utf8'))

describe('toCompact', () => {
  it('maps a normal card including flavor and artist', () => {
    const c = toCompact(sample['Llanowar Elves'])
    expect(c).toMatchObject({
      n: 'Llanowar Elves',
      m: '{G}',
      t: 'Creature — Elf Druid',
      o: '{T}: Add {G}.',
      p: '1',
      th: '1',
      c: 'G',
      a: 'Kev Walker',
      r: 58,
      id: sample['Llanowar Elves'].id,
    })
    expect(c.f).toMatch(/^The elves of the Llanowar forest/)
    expect(c.full).toBeUndefined()
  })

  it('uses face 0 of a transform card and keeps the full name', () => {
    const c = toCompact(sample['Delver of Secrets // Insectile Aberration'])
    expect(c.n).toBe('Delver of Secrets')
    expect(c.full).toBe('Delver of Secrets // Insectile Aberration')
    expect(c.t).toBe('Creature — Human Wizard')
    expect(c.c).toBe('U')
    expect(c.o).toMatch(/^At the beginning of your upkeep/)
  })

  it('derives split-card face colors from the face mana cost', () => {
    const c = toCompact(sample['Fire // Ice'])
    expect(c.n).toBe('Fire')
    expect(c.m).toBe('{1}{R}')
    expect(c.c).toBe('R')
  })

  it('keeps loyalty and orders multicolor in WUBRG order', () => {
    expect(toCompact(sample['Jace, the Mind Sculptor']).l).toBe('3')
    expect(toCompact(sample["Atraxa, Praetors' Voice"]).c).toBe('WUBG')
  })

  it('omits empty optional fields', () => {
    const c = toCompact(sample['Jace, the Mind Sculptor'])
    expect('p' in c).toBe(false)
    expect('f' in c).toBe(false)
  })
})

describe('isRealCard', () => {
  it('keeps normal paper cards and MTGO-printed paper cards', () => {
    expect(isRealCard(sample['Llanowar Elves'])).toBe(true)
    expect(isRealCard(sample['Palinchron'])).toBe(true)
  })
  it('rejects tokens, Un-cards, Alchemy, and basic lands', () => {
    expect(isRealCard(sample.token)).toBe(false)
    expect(isRealCard(sample.funny)).toBe(false)
    expect(isRealCard(sample.alchemy)).toBe(false)
    expect(isRealCard(sample['Forest'])).toBe(false)
  })
  it('rejects cards with underscore placeholders', () => {
    expect(isRealCard({ ...sample['Llanowar Elves'], name: '_____ Goblin' })).toBe(false)
  })
})

describe('isTopEligible', () => {
  it('needs commander legality and an EDHREC rank', () => {
    expect(isTopEligible(sample['Llanowar Elves'])).toBe(true)
    expect(isTopEligible({ ...sample['Llanowar Elves'], edhrec_rank: undefined })).toBe(false)
    expect(isTopEligible({ ...sample['Llanowar Elves'], legalities: { commander: 'banned' } })).toBe(false)
  })
})
