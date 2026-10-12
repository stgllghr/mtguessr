// Compact card record as written by scripts/build-cards.mjs. The card itself is its first face.
export type Face = {
  n: string // name
  m: string // mana cost
  t: string // type line
  o: string // oracle text
  f?: string // flavor text
  a?: string // artist
  p?: string
  th?: string
  l?: string // loyalty
  d?: string // defense
  c: string // frame colors in WUBRG order, "" for colorless
}

export type Layout = 'normal' | 'split' | 'aftermath' | 'adventure' | 'prepare' | 'mdfc' | 'transform' | 'flip'

/** Cards with a second printed face on the back. */
export const isTwoSided = (layout: Layout) => layout === 'mdfc' || layout === 'transform'

export type Card = Face & {
  full?: string // full name for multi-face cards, e.g. "A // B"
  r?: number // EDHREC rank
  id: string // Scryfall id
  lay?: Exclude<Layout, 'normal'>
  x?: Face[] // the other faces, in printed order
}

export const facesOf = (card: Card): Face[] => [card, ...(card.x ?? [])]

/** The two colors of a hybrid frame, left then right, or null. A face gets one when it is
 * exactly two colors and every colored mana symbol is a two-color hybrid ({G/W}). */
export function hybridPair(face: Face): [string, string] | null {
  if (face.c.length !== 2) return null
  const colored = (face.m.match(/\{[^}]+\}/g) ?? []).filter((s) => /[WUBRG]/.test(s))
  if (colored.length === 0 || !colored.every((s) => /^\{[WUBRG]\/[WUBRG]\}$/.test(s))) return null
  const [a, b] = colored[0].slice(1, -1).split('/')
  return [a, b]
}

/** The only name that counts: the front face, or both halves of a split card. */
export const answerName = (card: Card) => (card.lay === 'split' || card.lay === 'aftermath' ? (card.full ?? card.n) : card.n)

export const imageUrl = (id: string, side: 'front' | 'back' = 'front') =>
  `https://cards.scryfall.io/normal/${side}/${id[0]}/${id[1]}/${id}.jpg`

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

export const edhrecUrl = (card: Card) =>
  'https://edhrec.com/cards/' +
  stripAccents(answerName(card))
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')

export const scryfallUrl = (card: Card) => `https://scryfall.com/search?q=${encodeURIComponent(`!"${card.n}"`)}`

export const normalizeName = (s: string) => stripAccents(s).toLowerCase().replace(/[^a-z0-9]/g, '')
