// Turns card text into guessable tokens. A token's key is the guess that reveals it.

export type Token =
  | { kind: 'char'; ch: string; key: string | null } // key null = always visible
  | { kind: 'sym'; sym: string; keys: string[]; all: boolean } // all = every key needed
  | { kind: 'nl' }

const COLORS = ['W', 'U', 'B', 'R', 'G']
const SIMPLE_SYMBOLS = new Set([...COLORS, 'C', 'T', 'Q', 'E', 'S'])
const PHYREXIAN_KEYS = COLORS.map((c) => `{${c}/P}`)

/** The guess key for a character, or null when the character is always visible. */
export function charKey(ch: string): string | null {
  if (ch === '−') return '-'
  if (ch === '+' || ch === '-' || ch === '*') return ch
  const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  return /^[A-Z0-9]$/.test(base) ? base : null
}

/** Which keys reveal a mana/rules symbol like `{G}` or `{2/B}`. */
export function symbolKeys(sym: string): { keys: string[]; all: boolean } {
  const inner = sym.slice(1, -1)
  if (/^\d+$/.test(inner)) return { keys: [...new Set(inner)], all: true }
  if (inner === 'X' || inner === 'Y' || inner === 'Z') return { keys: [inner], all: false }
  if (SIMPLE_SYMBOLS.has(inner)) return { keys: [sym], all: false }
  if (inner === 'P') return { keys: PHYREXIAN_KEYS, all: false }
  const parts = inner.split('/')
  if (parts.length > 1) {
    if (parts.includes('P')) {
      const colors = parts.filter((p) => COLORS.includes(p))
      return { keys: colors.map((c) => `{${c}/P}`), all: false }
    }
    const keys = parts.flatMap((p) => (/^\d$/.test(p) ? [p] : SIMPLE_SYMBOLS.has(p) ? [`{${p}}`] : []))
    return { keys, all: false }
  }
  return { keys: [], all: false }
}

export function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  for (const part of text.split(/(\{[^}]+\})/)) {
    if (!part) continue
    if (/^\{[^}]+\}$/.test(part)) {
      tokens.push({ kind: 'sym', sym: part, ...symbolKeys(part) })
      continue
    }
    for (const ch of part) {
      if (ch === '\n') tokens.push({ kind: 'nl' })
      else tokens.push({ kind: 'char', ch, key: charKey(ch) })
    }
  }
  return tokens
}

export function isRevealed(t: Token, guessed: ReadonlySet<string>): boolean {
  if (t.kind === 'nl') return true
  if (t.kind === 'char') return t.key === null || guessed.has(t.key)
  if (t.keys.length === 0) return true
  return t.all ? t.keys.every((k) => guessed.has(k)) : t.keys.some((k) => guessed.has(k))
}

/** Every key that would reveal at least one token. */
export function keysIn(tokens: Token[]): Set<string> {
  const keys = new Set<string>()
  for (const t of tokens) {
    if (t.kind === 'char' && t.key) keys.add(t.key)
    if (t.kind === 'sym') t.keys.forEach((k) => keys.add(k))
  }
  return keys
}
