// Name guesses are typed into the card name's boxes: one box per letter, revealed or not.
// The whole name is typed every time; spaces and punctuation come from the name itself.
import { charKey, type Token } from './tokens'

const isSlot = (t: Token) => t.kind === 'char' && t.key !== null

export function slotCount(tokens: Token[]): number {
  return tokens.filter(isSlot).length
}

/** The typed characters that fill boxes (as their guess keys), up to `max`. */
export function entryKeys(raw: string, max: number): string {
  return [...raw]
    .map(charKey)
    .filter((k): k is string => k !== null)
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
