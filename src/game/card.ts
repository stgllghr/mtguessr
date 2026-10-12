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
  c: string // frame colors in WUBRG order, "" for colorless; a land's are the colors printed on it
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
  s?: string // set code of the printing, e.g. "WOE"
  cn?: string // collector number
  ry?: string // rarity letter: C, U, R, M, S (special) or B (bonus)
  g?: string // formats it's legal in: s = Standard, p = Pioneer, m = Modern
  fp?: Partial<Record<'s' | 'p' | 'm', PrintingOverride>> // a format's own printing, if different
}

/** Another printing of the same card: its image, set line, flavor text and artist. */
export type PrintingOverride = { id: string; s: string; cn: string; ry?: string; f?: string; a?: string; x?: { f?: string; a?: string }[] }

/** The card as printed in `p`: same rules text, that printing's image, set line, flavor and artist. */
export function withPrinting(card: Card, p: PrintingOverride | undefined): Card {
  if (!p) return card
  const out: Card = { ...card, id: p.id, s: p.s, cn: p.cn, ry: p.ry ?? card.ry, f: p.f, a: p.a ?? card.a }
  if (out.f === undefined) delete out.f
  if (card.x) {
    out.x = card.x.map((face, i) => {
      const back = { ...face, f: p.x?.[i]?.f, a: p.x?.[i]?.a ?? face.a }
      if (back.f === undefined) delete back.f
      return back
    })
  }
  return out
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

export const isLand = (face: Face) => /\bLand\b/.test(face.t)

// Two-color lands are printed two-tone in the usual pair order: Breeding Pool is green, then blue.
const PAIRS = ['WU', 'UB', 'BR', 'RG', 'GW', 'WB', 'UR', 'BG', 'RW', 'GU']

/** The two colors of a two-tone frame, left then right: a hybrid card or a two-color land. */
export function twoTone(face: Face): [string, string] | null {
  const hybrid = hybridPair(face)
  if (hybrid || !isLand(face) || face.c.length !== 2) return hybrid
  const pair = PAIRS.find((p) => face.c.includes(p[0]) && face.c.includes(p[1]))!
  return [pair[0], pair[1]]
}

/** The only name that counts: the front face, or both halves of a split card. */
export const answerName = (card: Card) => (card.lay === 'split' || card.lay === 'aftermath' ? (card.full ?? card.n) : card.n)

export const imageUrl = (id: string, side: 'front' | 'back' = 'front', version: 'normal' | 'art_crop' = 'normal') =>
  `https://cards.scryfall.io/${version}/${side}/${id[0]}/${id[1]}/${id}.jpg`

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
