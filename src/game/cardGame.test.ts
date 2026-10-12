import { describe, expect, it } from 'vitest'
import type { Card } from './card'
import { edhrecUrl, imageUrl, normalizeName } from './card'
import {
  MAX_TRIES,
  artHints,
  buildView,
  canUseArtHint,
  guessArt,
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
const delver: Card = {
  n: 'Delver of Secrets', full: 'Delver of Secrets // Insectile Aberration', m: '{U}', t: 'Creature — Human Wizard', o: '', c: 'U', id: 'y', lay: 'transform',
  x: [{ n: 'Insectile Aberration', m: '', t: 'Creature — Human Insect', o: 'Flying', p: '3', th: '2', c: 'U' }],
}
const fireIce: Card = {
  n: 'Fire', full: 'Fire // Ice', m: '{1}{R}', t: 'Instant', o: 'Fire deals 2 damage.', c: 'R', id: 'z', lay: 'split',
  x: [{ n: 'Ice', m: '{1}{U}', t: 'Instant', o: 'Tap target permanent.', c: 'U' }],
}

const shown = (tokens: Token[], game: CardGame) =>
  tokens.map((t) => (t.kind === 'nl' ? '\n' : !isRevealed(t, guessedKeys(game)) ? '_' : t.kind === 'char' ? t.ch : t.sym)).join('')

const play = (card: Card, keys: string[]) => {
  const view = buildView(card)
  return keys.reduce((g, k) => guessKey(view, g, k), newCardGame())
}

describe('buildView', () => {
  it('hides every letter of the whole type line but keeps the dash', () => {
    const v = buildView(elves).faces[0]
    expect(shown(v.types, newCardGame())).toBe('________ — ___ _____')
  })
  it('hides flavor text and artist', () => {
    const v = buildView(elves).faces[0]
    expect(shown(v.flavor, newCardGame())).toBe('___ ____ ______.')
    expect(shown(v.artist, newCardGame())).toBe('___ ______')
  })
  it('builds P/T with a visible slash, loyalty for planeswalkers, none otherwise', () => {
    expect(shown(buildView(elves).faces[0].stats!, newCardGame())).toBe('_/_')
    expect(shown(buildView(jace).faces[0].stats!, newCardGame())).toBe('_')
    expect(buildView(delver).faces[0].stats).toBeNull()
  })
  it('handles cards without flavor or artist', () => {
    expect(buildView(jace).faces[0].flavor).toEqual([])
    expect(buildView(jace).faces[0].artist).toEqual([])
  })
})

describe('guessKey', () => {
  it('reveals matching characters everywhere and records a hit', () => {
    const g = play(elves, ['E'])
    expect(g.guesses).toEqual([{ type: 'key', key: 'E', hit: true }])
    const v = buildView(elves).faces[0]
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
    expect(shown(buildView(elves).faces[0].cost, g)).toBe('{G}')
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
  it('only accepts the main name: the front face, or both halves of a split card', () => {
    expect(guessName(delver, newCardGame(), 'Delver of Secrets').status).toBe('won')
    expect(guessName(delver, newCardGame(), 'Insectile Aberration').status).toBe('playing')
    expect(guessName(delver, newCardGame(), 'Delver of Secrets // Insectile Aberration').status).toBe('playing')
    expect(guessName(fireIce, newCardGame(), 'Fire // Ice').status).toBe('won')
    expect(guessName(fireIce, newCardGame(), 'Fire').status).toBe('playing')
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

describe('multi-face cards', () => {
  it('has a view for every face', () => {
    const v = buildView(delver)
    expect(v.layout).toBe('transform')
    expect(v.faces.map((f) => shown(f.name, newCardGame()))).toEqual(['______ __ _______', '_________ __________'])
    expect(buildView(elves).layout).toBe('normal')
  })
  it('shares guesses across faces: a letter only on the back still hits', () => {
    const g = play(delver, ['B'])
    expect(g.guesses[0].hit).toBe(true)
    expect(shown(buildView(delver).faces[1].name, g)).toBe('_________ _b________')
  })
  it('uses both halves of a split card as the answer', () => {
    expect(shown(buildView(fireIce).answer, newCardGame())).toBe('____ // ___')
    expect(play(fireIce, ['F', 'I', 'R', 'E', 'C']).status).toBe('won')
    expect(play(fireIce, ['F', 'I', 'R', 'E']).status).toBe('playing')
  })
  it('wins a double-faced card by revealing the front name only', () => {
    expect(play(delver, ['D', 'E', 'L', 'V', 'R', 'O', 'F', 'S', 'C', 'T']).status).toBe('won')
  })
})

describe('sections', () => {
  const kinds = (card: Card) => buildView(card).faces[0].sections.map((s) => s.kind)
  it('splits planeswalker loyalty abilities from static text', () => {
    const lili: Card = { n: 'Liliana', m: '{1}{B}{B}', t: 'Legendary Planeswalker — Liliana', o: 'Static line.\n+1: Each player discards a card.\n−2: Sacrifice.\n0: Nothing.\n−X: Big.', l: '3', c: 'B', id: 'l' }
    expect(kinds(lili)).toEqual(['plain', 'loyalty', 'loyalty', 'loyalty', 'loyalty'])
    const s = buildView(lili).faces[0].sections[2]
    expect(shown(s.badge!, newCardGame())).toBe('__')
    expect(shown(s.tokens, newCardGame())).toBe('_________.')
    expect(buildView(lili).faces[0].kind).toBe('planeswalker')
  })
  const saga: Card = { n: 'The Eldest Reborn', m: '{4}{B}', t: 'Enchantment — Saga', o: '(Lore.)\nI — One.\nII, III — Two.', c: 'B', id: 's' }
  it('splits saga chapters, one numeral per chapter, shared text kept together', () => {
    expect(kinds(saga)).toEqual(['plain', 'chapter', 'chapter'])
    const shared = buildView(saga).faces[0].sections[2]
    expect(shared.chapters).toEqual(['II', 'III'])
    expect(shared.badge).toBeNull()
    expect(shown(shared.tokens, newCardGame())).toBe('___.')
    expect(buildView(saga).faces[0].kind).toBe('saga')
  })
  it('shows chapter numerals, so guessing I, V or X is not a hit because of them', () => {
    expect(play(saga, ['I']).guesses[0].hit).toBe(false)
  })
  it('splits class levels into level bars', () => {
    const cls: Card = { n: 'Druid Class', m: '{1}{G}', t: 'Enchantment — Class', o: '(Reminder.)\nLandfall.\n{2}{G}: Level 2\nExtra land.', c: 'G', id: 'c' }
    expect(kinds(cls)).toEqual(['plain', 'plain', 'level', 'plain'])
    const level = buildView(cls).faces[0].sections[2]
    expect(shown(level.badge!, newCardGame())).toBe('__')
    expect(shown(level.tokens, newCardGame())).toBe('_____ _')
  })
  it('marks battles', () => {
    expect(buildView({ ...elves, t: 'Battle — Siege', d: '5' }).faces[0].kind).toBe('battle')
  })
})

describe('set line', () => {
  const printed: Card = { ...elves, s: 'WOE', cn: '221', ry: 'U' }
  it('hides the rarity, collector number (padded like modern cards) and set code', () => {
    const info = buildView(printed).info!
    expect(shown(info.rarity, newCardGame())).toBe('_')
    expect(shown(info.number, newCardGame())).toBe('____')
    expect(shown(info.set, newCardGame())).toBe('___')
    expect(shown(buildView({ ...printed, cn: '12a' }).info!.number, newCardGame())).toBe('___')
  })
  it('counts set line letters and numbers as hits and reveals them', () => {
    const g = play(printed, ['W', '0'])
    expect(g.guesses.map((x) => x.hit)).toEqual([true, true])
    expect(shown(buildView(printed).info!.set, g)).toBe('W__')
    expect(shown(buildView(printed).info!.number, g)).toBe('0___')
  })
  it('is absent for cards without printing details', () => {
    expect(buildView(elves).info).toBeNull()
  })
})

describe('art hints', () => {
  it('cost three tries each and are counted', () => {
    const g = guessArt(newCardGame())
    expect(g.guesses).toEqual([{ type: 'art', hit: true }])
    expect(triesLeft(g)).toBe(MAX_TRIES - 3)
    expect(artHints(guessArt(g))).toBe(2)
  })
  it('allow four hints, always leaving a try to name the card', () => {
    let g = newCardGame()
    for (let i = 0; i < 4; i++) g = guessArt(g)
    expect(artHints(g)).toBe(4)
    expect(triesLeft(g)).toBe(1)
    expect(canUseArtHint(g)).toBe(false)
    expect(guessArt(g)).toBe(g)
    expect(guessName(elves, g, 'Llanowar Elves').status).toBe('won')
    expect(guessName(elves, g, 'Elvish Mystic').status).toBe('lost')
  })
  it('are not offered with three or fewer tries left, or once the card is over', () => {
    const low = play(elves, ['Q', 'Z', 'J', 'K', 'X', 'Y', 'U', 'B', 'C', 'D'])
    expect(triesLeft(low)).toBe(3)
    expect(canUseArtHint(low)).toBe(false)
    expect(canUseArtHint(guessName(elves, newCardGame(), 'Llanowar Elves'))).toBe(false)
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
