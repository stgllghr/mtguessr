import { describe, expect, it } from 'vitest'
import { hybridPair, twoTone, type Face } from './card'

const face = (m: string, c: string): Face => ({ n: 'x', m, t: 'Creature', o: '', c })

describe('hybridPair', () => {
  it('finds two-color hybrid cards, in the order of the hybrid symbol', () => {
    expect(hybridPair(face('{1}{G/W}{G/W}', 'WG'))).toEqual(['G', 'W'])
    expect(hybridPair(face('{2}{W/U}', 'WU'))).toEqual(['W', 'U'])
    expect(hybridPair(face('{R/W}{R/W}{R/W}', 'WR'))).toEqual(['R', 'W'])
  })
  it('leaves gold cards, mono-color hybrids and mixed costs alone', () => {
    expect(hybridPair(face('{W}{U}', 'WU'))).toBeNull()
    expect(hybridPair(face('{R}{R/G}', 'RG'))).toBeNull()
    expect(hybridPair(face('{2/W}{2/W}', 'W'))).toBeNull()
    expect(hybridPair(face('', 'WU'))).toBeNull()
    expect(hybridPair(face('{G}', 'G'))).toBeNull()
  })
})

describe('twoTone', () => {
  const land = (c: string, t = 'Land'): Face => ({ n: 'x', m: '', t, o: '', c })

  it('finds hybrid cards and two-color lands, in the order they are printed', () => {
    expect(twoTone(face('{1}{G/W}{G/W}', 'WG'))).toEqual(['G', 'W'])
    expect(twoTone(land('UB', 'Land — Island Swamp'))).toEqual(['U', 'B'])
    expect(twoTone(land('UG'))).toEqual(['G', 'U'])
    expect(twoTone(land('WR'))).toEqual(['R', 'W'])
    expect(twoTone(land('WB'))).toEqual(['W', 'B'])
    expect(twoTone(land('BR', 'Artifact Land'))).toEqual(['B', 'R'])
  })
  it('leaves gold spells and lands with one, three or no colors alone', () => {
    expect(twoTone(face('{U}{B}', 'UB'))).toBeNull()
    expect(twoTone(land('B'))).toBeNull()
    expect(twoTone(land('WUR'))).toBeNull()
    expect(twoTone(land(''))).toBeNull()
  })
})
