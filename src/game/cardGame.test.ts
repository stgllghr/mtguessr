import { describe, expect, it } from 'vitest'
import type { Card } from './card'
import { edhrecUrl, imageUrl, normalizeName } from './card'
import {
  MAX_TRIES,
  buildView,
  guessKey,
  guessName,
  guessedKeys,
  newCardGame,
  triesLeft,
  type CardGame,
} from './cardGame'
import { isRevealed, type Token } from './tokens'

const elves: Card = {
  n: 'Llanowar Elves',
  m: '{G}',
  t: 'Creature — Elf Druid',
  o: '{T}: Add {G}.',
  f: 'One bone broken.',
  a: 'Kev Walker',
  p: '1',
  th: '1',
  c: 'G',
  r: 58,
  id: '6a0b230b-d391-4998-a3f7-7b158a0ec2cd',
}
const jace: Card = { n: 'Jace, the Mind Sculptor', m: '{2}{U}{U}', t: 'Legendary Planeswalker — Jace', o: '+2: Look.', l: '3', c: 'U', id: 'x' }
const delver: Card = { n: 'Delver of Secrets', full: 'Delver of Secrets // Insectile Aberration', m: '{U}', t: 'Creature — Human Wizard', o: '', c: 'U', id: 'y' }

const shown = (tokens: Token[], game: CardGame) =>
  tokens.map((t) => (t.kind === 'nl' ? '\n' : !isRevealed(t, guessedKeys(game)) ? '_' : t.kind === 'char' ? t.ch : t.sym)).join('')

const play = (card: Card, keys: string[]) => {
  const view = buildView(card)
  return keys.reduce((g, k) => guessKey(view, g, k), newCardGame())
}

describe('buildView', () => {
  it('hides every letter of the whole type line but keeps the dash', () => {
    const v = buildView(elves)
    expect(shown(v.types, newCardGame())).toBe('________ — ___ _____')
  })
  it('hides flavor text and artist', () => {
    const v = buildView(elves)
    expect(shown(v.flavor, newCardGame())).toBe('___ ____ ______.')
    expect(shown(v.artist, newCardGame())).toBe('___ ______')
  })
  it('builds P/T with a visible slash, loyalty for planeswalkers, none otherwise', () => {
    expect(shown(buildView(elves).stats!, newCardGame())).toBe('_/_')
    expect(shown(buildView(jace).stats!, newCardGame())).toBe('_')
    expect(buildView(delver).stats).toBeNull()
  })
  it('handles cards without flavor or artist', () => {
    expect(buildView(jace).flavor).toEqual([])
    expect(buildView(jace).artist).toEqual([])
  })
})

describe('guessKey', () => {
  it('reveals matching characters everywhere and records a hit', () => {
    const g = play(elves, ['E'])
    expect(g.guesses).toEqual([{ type: 'key', key: 'E', hit: true }])
    const v = buildView(elves)
    expect(shown(v.name, g)).toBe('________ E__e_')
    expect(shown(v.types, g)).toBe('__e____e — E__ _____')
    expect(shown(v.artist, g)).toBe('_e_ ____e_')
  })
  it('records a miss and still costs a try', () => {
    const g = play(elves, ['Q'])
    expect(g.guesses[0]).toEqual({ type: 'key', key: 'Q', hit: false })
    expect(triesLeft(g)).toBe(MAX_TRIES - 1)
  })
  it('reveals mana symbols with symbol keys', () => {
    const g = play(elves, ['{G}'])
    expect(g.guesses[0].hit).toBe(true)
    expect(shown(buildView(elves).cost, g)).toBe('{G}')
  })
  it('ignores a key that was already guessed', () => {
    const g = play(elves, ['E', 'E'])
    expect(g.guesses).toHaveLength(1)
  })
  it('wins once every hidden character of the name is revealed', () => {
    const g = play(elves, ['L', 'A', 'N', 'O', 'W', 'R', 'E', 'V', 'S'])
    expect(g.status).toBe('won')
  })
  it('loses after 13 tries without a win and then accepts nothing', () => {
    const misses = ['Q', 'Z', 'J', 'K', 'X', 'Y', 'U', 'B', 'C', 'D', 'F', 'G', 'H']
    const g = play(elves, misses)
    expect(g.status).toBe('lost')
    expect(triesLeft(g)).toBe(0)
    expect(guessKey(buildView(elves), g, 'L')).toBe(g)
  })
})

describe('guessName', () => {
  it('accepts names ignoring case, accents and punctuation', () => {
    expect(guessName(elves, newCardGame(), 'llanowar elves').status).toBe('won')
    expect(guessName(jace, newCardGame(), 'Jace the Mind Sculptor').status).toBe('won')
  })
  it('accepts the front face or full name of a multi-face card', () => {
    expect(guessName(delver, newCardGame(), 'Delver of Secrets').status).toBe('won')
    expect(guessName(delver, newCardGame(), 'Delver of Secrets // Insectile Aberration').status).toBe('won')
  })
  it('charges a try for a wrong name', () => {
    const g = guessName(elves, newCardGame(), 'Elvish Mystic')
    expect(g.status).toBe('playing')
    expect(g.guesses).toEqual([{ type: 'name', text: 'Elvish Mystic', hit: false }])
    expect(triesLeft(g)).toBe(MAX_TRIES - 1)
  })
  it('ignores blank guesses and guesses after the card is over', () => {
    expect(guessName(elves, newCardGame(), '   ').guesses).toHaveLength(0)
    const won = guessName(elves, newCardGame(), 'Llanowar Elves')
    expect(guessName(elves, won, 'x')).toBe(won)
  })
  it('loses when the last try is a wrong name', () => {
    const g = play(elves, ['Q', 'Z', 'J', 'K', 'X', 'Y', 'U', 'B', 'C', 'D', 'F', 'G'])
    expect(guessName(elves, g, 'Elvish Mystic').status).toBe('lost')
  })
})

describe('urls and names', () => {
  it('normalizes names', () => {
    expect(normalizeName("Lim-Dûl's Vault")).toBe('limdulsvault')
  })
  it('builds EDHREC and image URLs', () => {
    expect(edhrecUrl({ ...elves, n: "Atraxa, Praetors' Voice" })).toBe('https://edhrec.com/cards/atraxa-praetors-voice')
    expect(edhrecUrl({ ...elves, n: "Lim-Dûl's Vault" })).toBe('https://edhrec.com/cards/lim-duls-vault')
    expect(imageUrl('67f4c93b-080c-4196-b095-6a120a221988')).toBe(
      'https://cards.scryfall.io/normal/front/6/7/67f4c93b-080c-4196-b095-6a120a221988.jpg',
    )
  })
})
