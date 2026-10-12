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

describe('toCompact printing and formats', () => {
  it('keeps the set code, collector number and rarity letter of the printing', () => {
    expect(toCompact(sample['Llanowar Elves'])).toMatchObject({ s: 'FDN', cn: '227', ry: 'C' })
    expect(toCompact(sample['Jace, the Mind Sculptor'])).toMatchObject({ s: '2XM', cn: '56', ry: 'M' })
  })
  it('lists the formats a card is legal in as letters (s = Standard, p = Pioneer, m = Modern)', () => {
    expect(toCompact(sample['Llanowar Elves']).g).toBe('spm')
    expect(toCompact(sample['Jace, the Mind Sculptor']).g).toBe('m')
    expect('g' in toCompact(sample['Fire // Ice'])).toBe(false)
  })
})

describe('toCompact layouts', () => {
  it('keeps both halves of a split card, each with its own colors', () => {
    const c = toCompact(sample['Fire // Ice'])
    expect(c.lay).toBe('split')
    expect(c.x).toEqual([expect.objectContaining({ n: 'Ice', m: '{1}{U}', t: 'Instant', c: 'U' })])
  })
  it('tags aftermath split cards', () => {
    const c = toCompact(sample.aftermath)
    expect(c.lay).toBe('aftermath')
    expect(c.n).toBe('Heaven')
    expect(c.x[0].n).toBe('Earth')
  })
  it('keeps the back face of double-faced cards with its own colors', () => {
    const delver = toCompact(sample['Delver of Secrets // Insectile Aberration'])
    expect(delver.lay).toBe('transform')
    expect(delver.x[0]).toMatchObject({ n: 'Insectile Aberration', c: 'U', p: '3', th: '2' })
    const mdfc = toCompact(sample.mdfc)
    expect(mdfc.lay).toBe('mdfc')
    expect(mdfc.x[0]).toMatchObject({ n: 'Witch-Blessed Meadow', t: 'Land', c: '' })
  })
  it('keeps adventure, prepared and flip second halves in the card colors', () => {
    const adventure = toCompact(sample.adventure)
    expect(adventure.lay).toBe('adventure')
    expect(adventure.x[0]).toMatchObject({ n: 'Meager Meal', t: 'Sorcery — Adventure', c: 'B' })
    expect(toCompact(sample.prepare)).toMatchObject({ lay: 'prepare', x: [expect.objectContaining({ n: 'Have a Bite', c: 'B' })] })
    expect(toCompact(sample.flip)).toMatchObject({ lay: 'flip', x: [expect.objectContaining({ n: 'Nighteyes the Desecrator', p: '4', th: '2' })] })
  })
  it('colors an adventure or prepared spell by its own cost, apart from the creature', () => {
    const c = toCompact(sample['adventure-two-colors'])
    expect(c.c).toBe('B')
    expect(c.x[0]).toMatchObject({ n: 'Burn Together', c: 'R' })
  })
  it('leaves single-faced cards without a layout tag', () => {
    const c = toCompact(sample['Llanowar Elves'])
    expect('lay' in c).toBe(false)
    expect('x' in c).toBe(false)
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
