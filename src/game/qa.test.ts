import { describe, expect, it } from 'vitest'
import type { Card } from './card'
import { QA_CATEGORIES, qaCategory, qaOrder } from './qa'

const base = { m: '', o: '', c: '', id: 'x' }
const card = (n: string, t: string, extra: Partial<Card> = {}): Card => ({ ...base, n, t, ...extra })

const adventure = card('Gollum', 'Legendary Creature — Halfling', { lay: 'adventure' })
const prepared = card('Adventurous Eater', 'Creature — Human Warlock', { lay: 'prepare' })
const split = card('Fire', 'Instant', { lay: 'split' })
const aftermath = card('Heaven', 'Instant', { lay: 'aftermath' })
const flip = card('Nezumi Graverobber', 'Creature — Rat Rogue', { lay: 'flip' })
const battle = card('Invasion of Ikoria', 'Battle — Siege', { lay: 'transform' })
const transform = card('Delver of Secrets', 'Creature — Human Wizard', { lay: 'transform' })
const mdfc = card('Witch Enchanter', 'Creature — Human Warlock', { lay: 'mdfc' })
const saga = card('The Eldest Reborn', 'Enchantment — Saga')
const cls = card('Druid Class', 'Enchantment — Class')
const walker = card('Liliana of the Veil', 'Legendary Planeswalker — Liliana')
const plain = card('Llanowar Elves', 'Creature — Elf Druid')

describe('qaCategory', () => {
  it('names the special frame of every kind of card', () => {
    expect([adventure, prepared, split, aftermath, flip, battle, transform, mdfc, saga, cls, walker].map(qaCategory)).toEqual([
      'Adventure', 'Prepared', 'Split', 'Aftermath', 'Flip', 'Battle', 'Transform', 'MDFC', 'Saga', 'Class', 'Planeswalker',
    ])
  })
  it('leaves ordinary cards out', () => {
    expect(qaCategory(plain)).toBeNull()
  })
})

describe('qaOrder', () => {
  const cards = [plain, walker, { ...walker, n: 'Jace' }, adventure, battle, mdfc, { ...mdfc, n: 'Other MDFC' }, split, plain]

  it('includes every special card once and no ordinary ones', () => {
    const order = qaOrder(cards, 1)
    expect([...order].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
  it('takes turns between frames so rare ones come up as often as common ones', () => {
    const categories = qaOrder(cards, 1).map((i) => qaCategory(cards[i]))
    expect(categories).toEqual(['Adventure', 'Split', 'Battle', 'MDFC', 'Planeswalker', 'MDFC', 'Planeswalker'])
  })
  it('is the same for the same seed', () => {
    expect(qaOrder(cards, 7)).toEqual(qaOrder(cards, 7))
  })
  it('lists the rotation with the five most-wanted frames first', () => {
    expect(QA_CATEGORIES.slice(0, 5)).toEqual(['Adventure', 'Prepared', 'Split', 'Battle', 'MDFC'])
  })
})
