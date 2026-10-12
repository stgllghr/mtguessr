// QA mode: only cards with special frames (and lands, whose frames show the colors of mana
// they make), taking turns between frame types so rare frames (aftermath, flip) come up as
// often as common ones (transform).
import type { Card } from './card'
import { seededShuffle } from './random'

export const QA_CATEGORIES = [
  'Adventure', 'Prepared', 'Split', 'Battle', 'MDFC', 'Aftermath', 'Transform', 'Flip', 'Saga', 'Class', 'Planeswalker', 'Land',
] as const
export type QaCategory = (typeof QA_CATEGORIES)[number]

const BY_LAYOUT: Record<string, QaCategory> = {
  adventure: 'Adventure', prepare: 'Prepared', split: 'Split', aftermath: 'Aftermath', flip: 'Flip', mdfc: 'MDFC',
}

export function qaCategory(card: Card): QaCategory | null {
  if (card.lay === 'transform') return /\bBattle\b/.test(card.t) ? 'Battle' : 'Transform'
  if (card.lay) return BY_LAYOUT[card.lay] ?? null
  if (/\bSaga\b/.test(card.t)) return 'Saga'
  if (/\bClass\b/.test(card.t)) return 'Class'
  if (/\bPlaneswalker\b/.test(card.t)) return 'Planeswalker'
  if (/\bLand\b/.test(card.t)) return 'Land'
  return null
}

/** Indexes into `cards`: one card of each frame type in turn, each type shuffled by the seed. */
export function qaOrder(cards: Card[], seed: number): number[] {
  const groups = QA_CATEGORIES.map(() => [] as number[])
  cards.forEach((card, i) => {
    const category = qaCategory(card)
    if (category) groups[QA_CATEGORIES.indexOf(category)].push(i)
  })
  const shuffled = groups.map((g, i) => seededShuffle(g, seed + i))
  const order: number[] = []
  for (let round = 0; order.length < cards.length; round++) {
    const picks = shuffled.flatMap((g) => (round < g.length ? [g[round]] : []))
    if (picks.length === 0) break
    order.push(...picks)
  }
  return order
}
