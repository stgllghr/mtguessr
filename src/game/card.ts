// Compact card record as written by scripts/build-cards.mjs.
export type Card = {
  n: string // front face name (the answer)
  full?: string // full name for multi-face cards, e.g. "A // B"
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
  r?: number // EDHREC rank
  id: string // Scryfall id
}

export const imageUrl = (id: string) => `https://cards.scryfall.io/normal/front/${id[0]}/${id[1]}/${id}.jpg`

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

export const edhrecUrl = (card: Card) =>
  'https://edhrec.com/cards/' +
  stripAccents(card.n)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')

export const scryfallUrl = (card: Card) => `https://scryfall.com/search?q=${encodeURIComponent(`!"${card.n}"`)}`

export const normalizeName = (s: string) => stripAccents(s).toLowerCase().replace(/[^a-z0-9]/g, '')
