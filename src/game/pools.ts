// Card pools: which cards a run draws from. Each pool is built from the card snapshot, the
// MTGO staples lists, or (for a single set) that set's printings from Scryfall.
import { normalizeName, type Card, type Face } from './card'

export const FORMATS = ['standard', 'pioneer', 'modern'] as const
export type Format = (typeof FORMATS)[number]
const FORMAT_LETTER: Record<Format, string> = { standard: 's', pioneer: 'p', modern: 'm' }

export type Pool = 500 | 2000 | 10000 | 'all' | 'legends' | 'qa' | Format | `${Format}-staples` | `set:${string}`

export type Staples = {
  updated: string
  since: string
  source: string
  formats: Record<Format, { events: number; decks: number; cards: string[] }>
}

/** Everything loaded so far. `all` (top + rest), staples and sets load on demand. */
export type Catalog = { top: Card[]; all: Card[] | null; staples: Staples | null; sets: Record<string, Card[]> }

const SIMPLE: readonly unknown[] = [500, 2000, 10000, 'all', 'legends', 'qa', ...FORMATS, ...FORMATS.map((f) => `${f}-staples`)]

export function isPool(x: unknown): x is Pool {
  return SIMPLE.includes(x) || (typeof x === 'string' && /^set:[A-Z0-9]+$/.test(x))
}

const setCode = (pool: Pool) => (typeof pool === 'string' && pool.startsWith('set:') ? pool.slice(4) : null)
const stapleFormat = (pool: Pool) => (typeof pool === 'string' && pool.endsWith('-staples') ? (pool.slice(0, -8) as Format) : null)

export function poolNeeds(pool: Pool): { all: boolean; staples: boolean; set: string | null } {
  return { all: typeof pool !== 'number', staples: stapleFormat(pool) !== null, set: setCode(pool) }
}

const isLegendaryCreature = (c: Card) => /\bLegendary\b/.test(c.t) && /\bCreature\b/.test(c.t)

/** Normalized name (front face and full name) → card, for matching names from other sources. */
export function nameIndex(cards: Card[]): Map<string, Card> {
  const index = new Map<string, Card>()
  for (const c of cards) {
    for (const name of [c.n, c.full]) if (name && !index.has(normalizeName(name))) index.set(normalizeName(name), c)
  }
  return index
}

let staplesCache: { all: Card[]; staples: Staples; index: Map<string, Card> } | null = null

function stapleCards(format: Format, all: Card[], staples: Staples): Card[] {
  if (staplesCache?.all !== all || staplesCache.staples !== staples) staplesCache = { all, staples, index: nameIndex(all) }
  const index = staplesCache.index
  return staples.formats[format].cards.flatMap((name) => {
    const card = index.get(normalizeName(name)) ?? index.get(normalizeName(name.split('/')[0]))
    return card ? [card] : []
  })
}

/** The cards a pool draws from, or null while the data it needs is still loading. */
export function poolCards(pool: Pool, catalog: Catalog): Card[] | null {
  if (typeof pool === 'number') return catalog.top.slice(0, pool)
  const code = setCode(pool)
  if (code) return catalog.sets[code] ?? null
  const all = catalog.all
  if (!all) return null
  if (pool === 'all' || pool === 'qa') return all
  if (pool === 'legends') return all.filter(isLegendaryCreature)
  const staples = stapleFormat(pool)
  if (staples) return catalog.staples ? stapleCards(staples, all, catalog.staples) : null
  return all.filter((c) => c.g?.includes(FORMAT_LETTER[pool as Format]))
}

/** A Scryfall card object for one printing (only the fields we read). */
export type Printing = {
  id: string
  name: string
  set: string
  collector_number: string
  rarity: string
  flavor_text?: string
  artist?: string
  card_faces?: { flavor_text?: string; artist?: string }[]
}

const RARITY: Record<string, string> = { common: 'C', uncommon: 'U', rare: 'R', mythic: 'M', special: 'S', bonus: 'B' }

function withPrinting<F extends Face>(face: F, flavor: string | undefined, artist: string | undefined): F {
  const out = { ...face, f: flavor, a: artist ?? face.a }
  if (out.f === undefined) delete out.f
  return out
}

/** A set's printing of a catalog card: the catalog's rules text with the printing's id
 * (image), collector number, rarity, flavor text and artist. Null if not in the catalog. */
export function fromPrinting(p: Printing, index: Map<string, Card>): Card | null {
  const base = index.get(normalizeName(p.name)) ?? index.get(normalizeName(p.name.split(' // ')[0]))
  if (!base) return null
  const faces = p.card_faces ?? [p]
  const card: Card = {
    ...withPrinting(base, faces[0].flavor_text ?? p.flavor_text, faces[0].artist ?? p.artist),
    id: p.id,
    s: p.set.toUpperCase(),
    cn: p.collector_number,
  }
  if (RARITY[p.rarity]) card.ry = RARITY[p.rarity]
  if (base.x) card.x = base.x.map((f, i) => withPrinting(f, faces[i + 1]?.flavor_text, faces[i + 1]?.artist))
  return card
}
