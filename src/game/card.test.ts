import { describe, expect, it } from 'vitest'
import { hybridPair, type Face } from './card'

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
