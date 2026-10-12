import { describe, expect, it } from 'vitest'
import { checkCards, checkStaples } from './check-data.mjs'

const card = (n) => ({ n, id: `${n}-id`, t: 'Instant', o: '', m: '', c: '' })
const many = (count, prefix) => Array.from({ length: count }, (_, i) => card(`${prefix}${i}`))

describe('checkCards', () => {
  const top = many(10000, 't')
  const rest = many(22000, 'r')

  it('accepts a full snapshot', () => {
    expect(checkCards(top, rest, 32000)).toEqual([])
  })
  it('flags a short top list, a small catalog, or a big drop from last time', () => {
    expect(checkCards(top.slice(0, 9000), rest, null)).toContain('cards-top.json has 9000 cards, expected 10000')
    expect(checkCards(top, rest.slice(0, 1000), null).join()).toMatch(/only 11000 cards/)
    expect(checkCards(top, rest, 40000).join()).toMatch(/dropped from 40000 to 32000/)
  })
  it('flags cards missing a name, id or type line', () => {
    expect(checkCards([...top.slice(1), { ...card('x'), id: '' }], rest, null).join()).toMatch(/missing a name, id or type line/)
  })
})

describe('checkStaples', () => {
  const formats = (cards, decks) => ({
    standard: { events: 50, decks, cards: Array.from({ length: cards }, (_, i) => `s${i}`) },
    pioneer: { events: 50, decks, cards: Array.from({ length: cards }, (_, i) => `p${i}`) },
    modern: { events: 50, decks, cards: Array.from({ length: cards }, (_, i) => `m${i}`) },
  })
  const staples = (cards, decks) => ({ updated: '2026-10-13', since: '2026-09-01', source: 'mtgo', formats: formats(cards, decks) })

  it('accepts healthy staples lists', () => {
    expect(checkStaples(staples(350, 900), staples(360, 950))).toEqual([])
  })
  it('flags formats with too few decks or staples, or a list that shrank by half', () => {
    expect(checkStaples(staples(350, 40), null).join()).toMatch(/standard: only 40 decks/)
    expect(checkStaples(staples(20, 900), null).join()).toMatch(/modern: only 20 staples/)
    expect(checkStaples(staples(150, 900), staples(400, 900)).join()).toMatch(/pioneer: 150 staples, down from 400/)
  })
})
