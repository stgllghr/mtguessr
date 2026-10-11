// Builds public/cards-top.json and public/cards-rest.json from Scryfall's Oracle Cards bulk file.
// Usage: node scripts/build-cards.mjs [path/to/oracle-cards.jsonl.gz]
import { createReadStream, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'
import { pathToFileURL } from 'node:url'
import { createGunzip } from 'node:zlib'

const TOP_COUNT = 10000
const UA = { 'User-Agent': 'SpellifyEndless/0.1', Accept: 'application/json' }

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

const LAYOUTS = { split: 'split', adventure: 'adventure', prepare: 'prepare', transform: 'dfc', modal_dfc: 'dfc', flip: 'flip' }

function layoutOf(raw) {
  if (raw.layout === 'split' && raw.keywords?.includes('Aftermath')) return 'aftermath'
  return LAYOUTS[raw.layout]
}

const orderColors = (colors) => WUBRG.filter((c) => colors.includes(c)).join('')
const costColors = (cost) => WUBRG.filter((c) => (cost ?? '').includes(c))

/** Frame colors for one face: split halves are colored by their own cost, double-faced
 * faces by their own colors, and everything else (adventure, prepared, flip) by the card. */
function faceColors(raw, face, layout) {
  if (layout === 'split' || layout === 'aftermath') return orderColors(costColors(face.mana_cost))
  return orderColors(face.colors ?? raw.colors ?? [])
}

function compactFace(raw, face, layout) {
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
    c: faceColors(raw, face, layout),
  }
  for (const k of Object.keys(out)) if (out[k] === undefined || (out[k] === '' && !['m', 'o', 'c'].includes(k))) delete out[k]
  return out
}

export function toCompact(raw) {
  const layout = layoutOf(raw)
  const faces = raw.card_faces ?? [raw]
  const card = { ...compactFace(raw, faces[0], layout) }
  if (faces[0].name !== raw.name) card.full = raw.name
  if (raw.edhrec_rank !== undefined) card.r = raw.edhrec_rank
  card.id = raw.id
  if (layout && faces.length > 1) {
    card.lay = layout
    card.x = faces.slice(1).map((f) => compactFace(raw, f, layout))
  }
  return card
}

async function openBulk(localPath) {
  if (localPath) return createReadStream(localPath)
  const index = await (await fetch('https://api.scryfall.com/bulk-data', { headers: UA })).json()
  const entry = index.data.find((d) => d.type === 'oracle_cards')
  const url = entry.jsonl_download_uri ?? entry.download_uri
  console.log(`Downloading ${url}`)
  const res = await fetch(url, { headers: UA })
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  return Readable.fromWeb(res.body)
}

async function main() {
  const input = (await openBulk(process.argv[2])).pipe(createGunzip())
  const kept = []
  for await (const line of createInterface({ input, crlfDelay: Infinity })) {
    if (!line.trim()) continue
    const raw = JSON.parse(line)
    if (isRealCard(raw)) kept.push(raw)
  }
  const ranked = kept.filter(isTopEligible).sort((a, b) => a.edhrec_rank - b.edhrec_rank)
  const top = ranked.slice(0, TOP_COUNT)
  const topIds = new Set(top.map((c) => c.id))
  const rest = kept.filter((c) => !topIds.has(c.id))
  writeFileSync('public/cards-top.json', JSON.stringify(top.map(toCompact)))
  writeFileSync('public/cards-rest.json', JSON.stringify(rest.map(toCompact)))
  console.log(`top: ${top.length}, rest: ${rest.length}, total: ${top.length + rest.length}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
