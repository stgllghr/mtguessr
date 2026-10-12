// Builds public/cards-top.json and public/cards-rest.json from Scryfall's Oracle Cards bulk file.
// Usage: node scripts/build-cards.mjs [oracle-cards.jsonl.gz] [default-cards.jsonl.gz]
// (Without paths, both bulk files are downloaded: about 25 MB and 80 MB.)
import { createReadStream, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'
import { pathToFileURL } from 'node:url'
import { createGunzip } from 'node:zlib'
import { formatSetCodes, pickFormatPrinting, pickOriginalArtPrinting, slimPrinting } from './printings.mjs'

const TOP_COUNT = 10000
const UA = { 'User-Agent': 'MTGuessr/0.1', Accept: 'application/json' }

const NON_CARD_LAYOUTS = new Set([
  'token', 'double_faced_token', 'emblem', 'art_series', 'vanguard', 'planar', 'scheme',
  'front_card', 'host', 'augment', 'reversible_card',
])
const NON_CARD_SET_TYPES = new Set(['token', 'memorabilia', 'funny', 'minigame', 'alchemy'])
const WUBRG = ['W', 'U', 'B', 'R', 'G']

const front = (raw) => raw.card_faces?.[0] ?? raw

/** A real, printed Magic card (not a token, joke card, digital-only design or basic land). */
export function isRealCard(raw) {
  if (NON_CARD_LAYOUTS.has(raw.layout) || NON_CARD_SET_TYPES.has(raw.set_type)) return false
  const games = raw.games ?? []
  if (!games.includes('paper') && !games.includes('mtgo')) return false
  const f = front(raw)
  if ((f.type_line ?? raw.type_line ?? '').includes('Basic')) return false
  if (`${raw.name}${f.oracle_text ?? ''}`.includes('_')) return false
  return true
}

/** Eligible for the EDHREC-ranked Top-N pools. */
export function isTopEligible(raw) {
  return raw.legalities?.commander === 'legal' && typeof raw.edhrec_rank === 'number'
}

const LAYOUTS = { split: 'split', adventure: 'adventure', prepare: 'prepare', transform: 'transform', modal_dfc: 'mdfc', flip: 'flip' }

function layoutOf(raw) {
  if (raw.layout === 'split' && raw.keywords?.includes('Aftermath')) return 'aftermath'
  return LAYOUTS[raw.layout]
}

const orderColors = (colors) => WUBRG.filter((c) => colors.includes(c)).join('')
const costColors = (cost) => WUBRG.filter((c) => (cost ?? '').includes(c))

/** Frame colors for one face: split halves and adventure/prepared spells are colored by
 * their own cost, double-faced faces by their own colors, and the rest (the creature of an
 * adventure or prepared card, both halves of a flip card) by the card. */
function faceColors(raw, face, layout, index) {
  const ownCost = layout === 'split' || layout === 'aftermath' || ((layout === 'adventure' || layout === 'prepare') && index > 0)
  if (ownCost) return orderColors(costColors(face.mana_cost))
  return orderColors(face.colors ?? raw.colors ?? [])
}

function compactFace(raw, face, layout, index) {
  const out = {
    n: face.name,
    m: face.mana_cost ?? '',
    t: face.type_line ?? raw.type_line ?? '',
    o: face.oracle_text ?? '',
    f: face.flavor_text,
    a: face.artist ?? raw.artist,
    p: face.power,
    th: face.toughness,
    l: face.loyalty,
    d: face.defense,
    c: faceColors(raw, face, layout, index),
  }
  for (const k of Object.keys(out)) if (out[k] === undefined || (out[k] === '' && !['m', 'o', 'c'].includes(k))) delete out[k]
  return out
}

// Formats with their own pools, as single letters in a card's `g` field.
const FORMAT_LETTERS = { standard: 's', pioneer: 'p', modern: 'm' }
const RARITY_LETTERS = { common: 'C', uncommon: 'U', rare: 'R', mythic: 'M', special: 'S', bonus: 'B' }

/** A printing's image id, set line, flavor and artist, as a compact override. */
export function printingOverride(printing) {
  const out = {
    id: printing.id,
    s: printing.set.toUpperCase(),
    cn: printing.collector_number,
    ry: RARITY_LETTERS[printing.rarity],
    f: printing.faces[0]?.flavor_text,
    a: printing.faces[0]?.artist,
  }
  const backs = printing.faces.slice(1).map((f) => ({ f: f.flavor_text, a: f.artist }))
  if (backs.some((b) => b.f || b.a)) out.x = backs
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k]
  return out
}

/** A card from its Oracle record. `printing` (from printings.mjs) chooses the image, set line,
 * flavor text and artist; without one, the Oracle record's own printing is used. */
export function toCompact(raw, printing) {
  const layout = layoutOf(raw)
  const faces = raw.card_faces ?? [raw]
  const card = { ...compactFace(raw, faces[0], layout, 0) }
  if (faces[0].name !== raw.name) card.full = raw.name
  if (raw.edhrec_rank !== undefined) card.r = raw.edhrec_rank
  card.id = raw.id
  if (raw.set) card.s = raw.set.toUpperCase()
  if (raw.collector_number) card.cn = raw.collector_number
  if (RARITY_LETTERS[raw.rarity]) card.ry = RARITY_LETTERS[raw.rarity]
  const formats = Object.entries(FORMAT_LETTERS)
    .filter(([format]) => raw.legalities?.[format] === 'legal')
    .map(([, letter]) => letter)
    .join('')
  if (formats) card.g = formats
  if (layout && faces.length > 1) {
    card.lay = layout
    card.x = faces.slice(1).map((f, i) => compactFace(raw, f, layout, i + 1))
  }
  if (printing) {
    const o = printingOverride(printing)
    Object.assign(card, { id: o.id, s: o.s, cn: o.cn })
    if (o.ry) card.ry = o.ry
    if (o.f) card.f = o.f
    else delete card.f
    if (o.a) card.a = o.a
    card.x?.forEach((face, i) => {
      const back = printing.faces[i + 1]
      if (!back) return
      if (back.flavor_text) face.f = back.flavor_text
      else delete face.f
      if (back.artist) face.a = back.artist
    })
  }
  return card
}

async function openBulk(type, localPath) {
  if (localPath) return createReadStream(localPath)
  const index = await (await fetch('https://api.scryfall.com/bulk-data', { headers: UA })).json()
  const entry = index.data.find((d) => d.type === type)
  const url = entry.jsonl_download_uri ?? entry.download_uri
  console.log(`Downloading ${url}`)
  const res = await fetch(url, { headers: UA })
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  return Readable.fromWeb(res.body)
}

async function* lines(stream) {
  for await (const line of createInterface({ input: stream.pipe(createGunzip()), crlfDelay: Infinity })) {
    if (line.trim()) yield JSON.parse(line)
  }
}

async function main() {
  const [oraclePath, defaultPath] = process.argv.slice(2)
  const kept = []
  for await (const raw of lines(await openBulk('oracle_cards', oraclePath))) if (isRealCard(raw)) kept.push(raw)

  // Every English printing of the cards we keep, to choose each card's art and set line.
  const keptIds = new Set(kept.map((c) => c.oracle_id ?? c.card_faces?.[0]?.oracle_id))
  const printingsOf = new Map()
  const allPrintings = []
  for await (const raw of lines(await openBulk('default_cards', defaultPath))) {
    const p = slimPrinting(raw)
    if (!keptIds.has(p.oracle_id)) continue
    allPrintings.push(p)
    if (!printingsOf.has(p.oracle_id)) printingsOf.set(p.oracle_id, [])
    printingsOf.get(p.oracle_id).push(p)
  }
  const legalities = Object.fromEntries(kept.map((c) => [c.oracle_id ?? c.card_faces?.[0]?.oracle_id, c.legalities]))
  const formatSets = formatSetCodes(allPrintings, legalities)
  console.log(`${allPrintings.length} printings; format sets: ${Object.entries(formatSets).map(([f, s]) => `${f} ${s.size}`).join(', ')}`)

  let reprintArt = 0
  const compact = (raw) => {
    const printings = printingsOf.get(raw.oracle_id ?? raw.card_faces?.[0]?.oracle_id) ?? []
    const original = pickOriginalArtPrinting(printings)
    const card = toCompact(raw, original ?? undefined)
    if (original && original.id !== raw.id) reprintArt++
    // Format pools show the format's own newest printing, when it differs.
    for (const [format, letter] of Object.entries(FORMAT_LETTERS)) {
      if (!card.g?.includes(letter)) continue
      const own = pickFormatPrinting(printings, formatSets[format])
      if (own && own.id !== card.id) (card.fp ??= {})[letter] = printingOverride(own)
    }
    return card
  }

  const ranked = kept.filter(isTopEligible).sort((a, b) => a.edhrec_rank - b.edhrec_rank)
  const top = ranked.slice(0, TOP_COUNT)
  const topIds = new Set(top.map((c) => c.id))
  const rest = kept.filter((c) => !topIds.has(c.id))
  writeFileSync('public/cards-top.json', JSON.stringify(top.map(compact)))
  writeFileSync('public/cards-rest.json', JSON.stringify(rest.map(compact)))
  console.log(`top: ${top.length}, rest: ${rest.length}, total: ${top.length + rest.length}; original art moved ${reprintArt} cards off a reprint`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
