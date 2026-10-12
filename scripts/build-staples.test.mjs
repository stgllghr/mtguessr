import { describe, expect, it } from 'vitest'
import { eventLinks, extractDecks, rankStaples } from './build-staples.mjs'

const card = (name, qty = '1') => ({ qty, card_attributes: { card_name: name } })
const eventPage = (decklists) =>
  `<html><script>\nwindow.MTGO.decklists.data = ${JSON.stringify({ format: 'CMODERN', decklists })};\nwindow.MTGO.decklists.type = "x";\n</script></html>`

describe('eventLinks', () => {
  it('finds Standard, Pioneer and Modern events with their dates', () => {
    const html = `
      <a href="/decklist/modern-challenge-32-2026-10-1112856172">x</a>
      <a href="/decklist/pioneer-league-2026-10-1211137">x</a>
      <a href="/decklist/standard-championship-week-finals-2026-10-1012856137">x</a>
      <a href="/decklist/pauper-league-2026-10-1211153">x</a>
      <a href="/decklist/modern-challenge-32-2026-10-1112856172">dupe</a>`
    expect(eventLinks(html)).toEqual([
      { path: '/decklist/modern-challenge-32-2026-10-1112856172', format: 'modern', date: '2026-10-11' },
      { path: '/decklist/pioneer-league-2026-10-1211137', format: 'pioneer', date: '2026-10-12' },
      { path: '/decklist/standard-championship-week-finals-2026-10-1012856137', format: 'standard', date: '2026-10-10' },
    ])
  })
})

describe('extractDecks', () => {
  it('reads each deck as the set of cards in its main deck and sideboard', () => {
    const html = eventPage([
      { main_deck: [card('Lightning Bolt', '4'), card('Mountain', '10')], sideboard_deck: [card('Wear/Tear')] },
      { main_deck: [card('Thoughtseize')], sideboard_deck: [card('Thoughtseize')] },
    ])
    expect(extractDecks(html)).toEqual([
      ['Lightning Bolt', 'Mountain', 'Wear/Tear'],
      ['Thoughtseize'],
    ])
  })
  it('returns no decks for a page without decklist data', () => {
    expect(extractDecks('<html></html>')).toEqual([])
  })
})

describe('rankStaples', () => {
  it('ranks cards by how many decks play them, keeping those in enough decks and dropping basics', () => {
    const decks = [
      ['Lightning Bolt', 'Mountain', 'Thoughtseize'],
      ['Lightning Bolt', 'Island'],
      ['Lightning Bolt', 'Thoughtseize', 'Snow-Covered Forest'],
      ['Counterspell'],
    ]
    expect(rankStaples(decks, 0.5)).toEqual(['Lightning Bolt', 'Thoughtseize'])
    expect(rankStaples(decks, 0.25)).toEqual(['Lightning Bolt', 'Thoughtseize', 'Counterspell'])
  })
})
