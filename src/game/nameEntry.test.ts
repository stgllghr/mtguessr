import { describe, expect, it } from 'vitest'
import type { Card } from './card'
import { guessName, newCardGame } from './cardGame'
import { composeName, entryKeys, slotCount } from './nameEntry'
import { tokenize } from './tokens'

const elves = tokenize('Llanowar Elves')
const atraxa = tokenize("Atraxa, Praetors' Voice")

describe('slotCount', () => {
  it('has a box for every letter of the name, revealed or not', () => {
    expect(slotCount(elves)).toBe(13)
    expect(slotCount(atraxa)).toBe(19)
  })
})

describe('entryKeys', () => {
  it('keeps every typed letter in order, including ones already revealed on the card', () => {
    expect(entryKeys("elspeth, sun's champion", 99)).toBe('ELSPETHSUNSCHAMPION')
    expect(entryKeys('Eee', 99)).toBe('EEE')
  })
  it('keeps hyphens and digits, folds accents, and drops spaces and punctuation', () => {
    expect(entryKeys("Lim-Dûl's 2", 99)).toBe('LIM-DULS2')
  })
  it('stops once every box is full', () => {
    expect(entryKeys('abcdef', 3)).toBe('ABC')
  })
})

describe('composeName', () => {
  it('puts typed letters in the boxes, with the name’s own spaces and punctuation', () => {
    expect(composeName(elves, 'LLANOWARELVES')).toBe('LLANOWAR ELVES')
    expect(composeName(atraxa, 'ATRAXAPRAETORSVOICE')).toBe("ATRAXA, PRAETORS' VOICE")
  })
  it('leaves unfilled boxes empty', () => {
    expect(composeName(elves, 'LL')).toBe('LL ')
  })
  it('makes a winning guess when the whole name is typed', () => {
    const card: Card = { n: "Elspeth, Sun's Champion", m: '{4}{W}{W}', t: 'Legendary Planeswalker — Elspeth', o: '', c: 'W', id: 'e' }
    const name = tokenize(card.n)
    const typed = entryKeys('elspeth suns champion', slotCount(name))
    expect(guessName(card, newCardGame(), composeName(name, typed)).status).toBe('won')
  })
})
