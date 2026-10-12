// Builds public/staples.json: the most-played cards in Standard, Pioneer and Modern, counted
// from the last few weeks of Magic Online tournament decklists published on mtgo.com.
// Usage: node scripts/build-staples.mjs
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const BASE = 'https://www.mtgo.com'
const FORMATS = ['standard', 'pioneer', 'modern']
const WINDOW_DAYS = 42
const MIN_SHARE = 0.01 // a staple is in at least 1% of decks
const DELAY_MS = 400
const CONCURRENCY = 4
const HEADERS = { 'User-Agent': 'MTGuessr/0.1 (fan-made card guessing game; staples refresh)', Accept: 'text/html' }
const TIMEOUT_MS = 20000
const ATTEMPTS = 3

const BASICS = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes'])
const isBasic = (name) => BASICS.has(name.replace(/^Snow-Covered /, ''))

/** Tournament events for our formats linked from an mtgo.com decklist index page. */
export function eventLinks(html) {
  const seen = new Set()
  const out = []
  const pattern = /href="(\/decklist\/((standard|pioneer|modern)-[a-z0-9-]*?-(\d{4}-\d{2}-\d{2})\d+))"/g
  for (const m of html.matchAll(pattern)) {
    if (seen.has(m[1])) continue
    seen.add(m[1])
    out.push({ path: m[1], format: m[3], date: m[4] })
  }
  return out
}

/** Every deck on an event page, as the distinct card names in its main deck and sideboard. */
export function extractDecks(html) {
  const m = /window\.MTGO\.decklists\.data\s*=\s*(\{.*?\});\s*\n/s.exec(html)
  if (!m) return []
  const data = JSON.parse(m[1])
  return (data.decklists ?? []).map((deck) => [
    ...new Set([...(deck.main_deck ?? []), ...(deck.sideboard_deck ?? [])].map((c) => c.card_attributes.card_name)),
  ])
}

/** Card names played in at least `minShare` of decks, most-played first. Basic lands are left out. */
export function rankStaples(decks, minShare) {
  const counts = new Map()
  for (const deck of decks) for (const name of deck) if (!isBasic(name)) counts.set(name, (counts.get(name) ?? 0) + 1)
  return [...counts]
    .filter(([, n]) => n / decks.length >= minShare)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Some connections stall, so every request has a timeout and a couple of retries.
async function get(path) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(BASE + path, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (err) {
      if (attempt >= ATTEMPTS) throw new Error(`${path}: ${err.message}`)
      await sleep(DELAY_MS * 2 * attempt)
    }
  }
}

async function main() {
  const now = new Date()
  const cutoff = new Date(now.getTime() - WINDOW_DAYS * 86400000).toISOString().slice(0, 10)
  const months = [0, 1, 2].map((back) => new Date(now.getFullYear(), now.getMonth() - back, 1))
  const events = []
  for (const month of months) {
    const path = `/decklists/${month.getFullYear()}/${String(month.getMonth() + 1).padStart(2, '0')}`
    events.push(...eventLinks(await get(path)).filter((e) => e.date >= cutoff))
    await sleep(DELAY_MS)
  }
  const unique = [...new Map(events.map((e) => [e.path, e])).values()]
  console.log(`${unique.length} events since ${cutoff}`)

  const decks = Object.fromEntries(FORMATS.map((f) => [f, []]))
  const counts = Object.fromEntries(FORMATS.map((f) => [f, 0]))
  // The site is slow to answer (often several seconds a page), so a few requests run at once.
  let next = 0
  let done = 0
  async function worker() {
    while (next < unique.length) {
      const event = unique[next++]
      try {
        const found = extractDecks(await get(event.path))
        decks[event.format].push(...found)
        counts[event.format]++
      } catch (err) {
        console.warn(`  skipped ${event.path}: ${err.message}`)
      }
      if (++done % 25 === 0) console.log(`  ${done}/${unique.length} events read`)
      await sleep(DELAY_MS)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  const formats = Object.fromEntries(
    FORMATS.map((f) => [f, { events: counts[f], decks: decks[f].length, cards: rankStaples(decks[f], MIN_SHARE) }]),
  )
  const out = { updated: now.toISOString().slice(0, 10), since: cutoff, source: 'Magic Online tournament results (mtgo.com)', formats }
  writeFileSync('public/staples.json', JSON.stringify(out))
  for (const f of FORMATS) console.log(`${f}: ${formats[f].cards.length} staples from ${formats[f].decks} decks in ${formats[f].events} events`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
