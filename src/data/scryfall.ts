// Live Scryfall lookups for single-set pools: the list of sets, and one set's printings.
// (The rest of the game runs from the bundled card snapshot.)
import type { Printing } from '../game/pools'

const API = 'https://api.scryfall.com'
const HEADERS = { Accept: 'application/json' }

export type SetInfo = { code: string; name: string; released: string }

// Sets made of real, playable cards (no tokens, promos, art series or joke sets).
const PLAYABLE = new Set([
  'core', 'expansion', 'masters', 'draft_innovation', 'commander', 'eternal', 'starter',
  'duel_deck', 'arsenal', 'from_the_vault', 'spellbook', 'premium_deck', 'box',
])

let setsRequest: Promise<SetInfo[]> | null = null

/** Playable paper sets, newest first. */
export function fetchSets(): Promise<SetInfo[]> {
  setsRequest ??= fetch(`${API}/sets`, { headers: HEADERS })
    .then((res) => {
      if (!res.ok) throw new Error(`Scryfall sets: HTTP ${res.status}`)
      return res.json()
    })
    .then((body: { data: { code: string; name: string; set_type: string; digital: boolean; card_count: number; released_at?: string }[] }) => {
      const today = new Date().toISOString().slice(0, 10)
      return body.data
        .filter((s) => PLAYABLE.has(s.set_type) && !s.digital && s.card_count >= 10 && (s.released_at ?? '') <= today)
        .map((s) => ({ code: s.code.toUpperCase(), name: s.name, released: s.released_at ?? '' }))
        .sort((a, b) => b.released.localeCompare(a.released))
    })
    .catch((err) => {
      setsRequest = null
      throw err
    })
  return setsRequest
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** One printing per card in a set, in collector number order. */
export async function fetchSetPrintings(code: string): Promise<Printing[]> {
  const query = encodeURIComponent(`e:${code} game:paper`)
  let url = `${API}/cards/search?q=${query}&unique=cards&order=set`
  const out: Printing[] = []
  while (url) {
    const res = await fetch(url, { headers: HEADERS })
    if (res.status === 404) return out // no cards match
    if (!res.ok) throw new Error(`Scryfall search: HTTP ${res.status}`)
    const page: { data: Printing[]; has_more: boolean; next_page?: string } = await res.json()
    out.push(...page.data)
    url = page.has_more && page.next_page ? page.next_page : ''
    if (url) await sleep(120) // Scryfall asks for no more than ~10 requests a second
  }
  return out
}
