// Name guesses are typed into the card name's boxes: one box per letter or number, revealed
// or not. The whole name is typed every time; spaces and punctuation (hyphens included) come
// from the name itself, and typed punctuation is ignored.
import { charKey, type Token } from './tokens'

const isLetterOrNumber = (key: string | null): key is string => key !== null && /^[A-Z0-9]$/.test(key)

/** Whether a name character gets a box to type into. */
export const isSlot = (t: Token) => t.kind === 'char' && isLetterOrNumber(t.key)

export function slotCount(tokens: Token[]): number {
  return tokens.filter(isSlot).length
}

/** The typed letters and numbers that fill boxes (as their guess keys), up to `max`. */
export function entryKeys(raw: string, max: number): string {
  return [...raw]
    .map(charKey)
    .filter(isLetterOrNumber)
    .join('')
    .slice(0, max)
}

/** The typed letters placed in the name's boxes, with its own spaces and punctuation. */
export function composeName(tokens: Token[], typed: string): string {
  let i = 0
  return tokens
    .map((t) => {
      if (t.kind === 'nl') return ''
      if (t.kind === 'sym') return t.sym
      return isSlot(t) ? (typed[i++] ?? '') : t.ch
    })
    .join('')
}
