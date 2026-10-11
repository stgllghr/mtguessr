import { describe, expect, it } from 'vitest'
import type { Card } from './card'
import { guessName, newCardGame } from './cardGame'
import { composeName, hiddenSlots, sanitizeEntry } from './nameEntry'
import { tokenize } from './tokens'

const elves = tokenize('Llanowar Elves')
const atraxa = tokenize("Atraxa, Praetors' Voice")

describe('hiddenSlots', () => {
  it('counts the name characters still hidden', () => {
    expect(hiddenSlots(elves, new Set())).toBe(13)
    expect(hiddenSlots(elves, new Set(['E']))).toBe(11)
    expect(hiddenSlots(atraxa, new Set())).toBe(19)
  })
})

describe('sanitizeEntry', () => {
  it('keeps guessable characters as keys and drops the rest', () => {
    expect(sanitizeEntry("ab-c d,é'*", 99)).toBe('AB-CDE*')
  })
  it('stops at the number of blanks', () => {
    expect(sanitizeEntry('abcdef', 3)).toBe('ABC')
  })
})

describe('composeName', () => {
  it('fills blanks in order around revealed letters, spaces and punctuation, in capitals', () => {
    expect(composeName(elves, new Set(['E']), 'LLANOWARLVS')).toBe('LLANOWAR ELVES')
    expect(composeName(atraxa, new Set(['A']), 'TRXPRETORSVOICE')).toBe("ATRAXA, PRAETORS' VOICE")
  })
  it('leaves unfilled blanks empty', () => {
    expect(composeName(elves, new Set(), 'LL')).toBe('LL ')
  })
  it('produces a winning guess when the letters are right', () => {
    const card: Card = { n: 'Llanowar Elves', m: '{G}', t: 'Creature — Elf Druid', o: '', c: 'G', id: 'x' }
    const name = composeName(elves, new Set(['E']), 'LLANOWARLVS')
    expect(guessName(card, newCardGame(), name).status).toBe('won')
  })
})
