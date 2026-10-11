// A revealed mana/rules symbol, drawn with mana-font.
const SPECIAL: Record<string, string> = { T: 'tap', Q: 'untap', '½': 'half', '∞': 'infinity' }
const UNSUPPORTED = new Set(['hw', 'hr'])
const NAMES: Record<string, string> = {
  W: 'white', U: 'blue', B: 'black', R: 'red', G: 'green', C: 'colorless', S: 'snow', P: 'Phyrexian',
}

function symClass(sym: string): string | null {
  const inner = sym.slice(1, -1).toUpperCase()
  const cls = SPECIAL[inner] ?? inner.toLowerCase().replace(/\//g, '')
  return /^[a-z0-9]+$/.test(cls) && !UNSUPPORTED.has(cls) ? cls : null
}

export function symLabel(sym: string): string {
  const inner = sym.slice(1, -1)
  if (inner === 'T') return 'tap symbol'
  if (inner === 'Q') return 'untap symbol'
  if (inner === 'E') return 'energy symbol'
  if (/^\d+$/.test(inner)) return `${inner} generic mana`
  const parts = inner.split('/')
  if (parts.includes('P')) return `Phyrexian ${parts.filter((p) => p !== 'P').map((p) => NAMES[p] ?? p).join(' or ')} mana`
  return `${parts.map((p) => NAMES[p] ?? p).join(' or ')} mana`
}

export function Sym({ sym }: { sym: string }) {
  const cls = symClass(sym)
  if (!cls) return <span className="sym-text">{sym.slice(1, -1)}</span>
  return <i className={`ms ms-cost ms-${cls}`} role="img" aria-label={symLabel(sym)} />
}
