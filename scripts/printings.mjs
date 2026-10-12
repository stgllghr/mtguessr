// Choosing which printing of a card to show: its art, reveal image, flavor text, artist and set
// line. By default that's the card's original art, on the newest printing that kept it; in
// Standard, Pioneer and Modern pools it's the newest printing from a set in that format.

// Printings that aren't a normal release of the card.
const SKIP_SET_TYPES = new Set([
  'promo', 'memorabilia', 'token', 'funny', 'alchemy', 'minigame', 'treasure_chest', 'vanguard', 'box', 'masterpiece',
])
const VARIANT_FRAMES = new Set(['showcase', 'extendedart', 'inverted', 'etched', 'fullart'])
const FORMAT_SET_TYPES = new Set(['core', 'expansion', 'draft_innovation'])
const FORMATS = ['standard', 'pioneer', 'modern']

/** A normal paper printing: no promos, digital-only, oversized, joke, or variant-frame printings. */
export function isEligiblePrinting(p) {
  if (p.digital || !(p.games ?? []).includes('paper')) return false
  if (p.promo || p.oversized || p.textless || p.variation || p.full_art) return false
  if ((p.lang ?? 'en') !== 'en' || SKIP_SET_TYPES.has(p.set_type)) return false
  if (p.border_color === 'borderless') return false
  return !(p.frame_effects ?? []).some((f) => VARIANT_FRAMES.has(f))
}

const number = (cn) => Number.parseInt(cn, 10) || 0
const oldestFirst = (a, b) => a.released_at.localeCompare(b.released_at) || number(a.collector_number) - number(b.collector_number)
const newest = (printings) => [...printings].sort(oldestFirst).at(-1) ?? null

/** The card's original art, on the newest printing that still uses it. */
export function pickOriginalArtPrinting(printings) {
  const eligible = printings.filter(isEligiblePrinting)
  const pool = eligible.length > 0 ? eligible : printings
  const first = [...pool].sort(oldestFirst)[0]
  if (!first?.illustration_id) return first ?? null
  return newest(pool.filter((p) => p.illustration_id === first.illustration_id))
}

/** For each format, the sets whose cards are all in that format (by card legality). */
export function formatSetCodes(printings, legalities) {
  const cardsBySet = new Map()
  for (const p of printings) {
    if (!FORMAT_SET_TYPES.has(p.set_type)) continue
    if (!cardsBySet.has(p.set)) cardsBySet.set(p.set, new Set())
    cardsBySet.get(p.set).add(p.oracle_id)
  }
  const out = Object.fromEntries(FORMATS.map((f) => [f, new Set()]))
  for (const [set, cards] of cardsBySet) {
    for (const f of FORMATS) {
      const inFormat = [...cards].filter((id) => (legalities[id]?.[f] ?? 'not_legal') !== 'not_legal').length
      if (inFormat / cards.size >= 0.98) out[f].add(set)
    }
  }
  return out
}

/** The newest normal printing from one of `sets`, or null. */
export function pickFormatPrinting(printings, sets) {
  return newest(printings.filter((p) => isEligiblePrinting(p) && sets.has(p.set)))
}

/** The fields we keep from a printing (as read from the bulk file). */
export function slimPrinting(raw) {
  const faces = raw.card_faces ?? [raw]
  return {
    id: raw.id,
    oracle_id: raw.oracle_id ?? faces[0].oracle_id,
    set: raw.set,
    set_type: raw.set_type,
    released_at: raw.released_at ?? '',
    collector_number: raw.collector_number,
    rarity: raw.rarity,
    games: raw.games,
    digital: raw.digital,
    promo: raw.promo,
    oversized: raw.oversized,
    textless: raw.textless,
    variation: raw.variation,
    full_art: raw.full_art,
    lang: raw.lang,
    border_color: raw.border_color,
    frame_effects: raw.frame_effects,
    illustration_id: raw.illustration_id ?? faces[0].illustration_id,
    faces: faces.map((f) => ({ flavor_text: f.flavor_text ?? (faces.length === 1 ? raw.flavor_text : undefined), artist: f.artist ?? raw.artist })),
  }
}
