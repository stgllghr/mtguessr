// Name guesses are typed into the card name's own blanks: revealed letters, spaces and
// punctuation are fixed, and typed characters fill the remaining blanks in order.
import { charKey, isRevealed, type Token } from './tokens'

const isBlank = (t: Token, guessed: ReadonlySet<string>) => t.kind === 'char' && !isRevealed(t, guessed)

export function hiddenSlots(tokens: Token[], guessed: ReadonlySet<string>): number {
  return tokens.filter((t) => isBlank(t, guessed)).length
}

/** Keeps only characters that can fill a blank (as their guess keys), up to `max`. */
export function sanitizeEntry(raw: string, max: number): string {
  return [...raw]
    .map(charKey)
    .filter((k): k is string => k !== null)
    .join('')
    .slice(0, max)
}

// Capitals throughout, so a wrong guess shown later doesn't reveal the answer's casing.
export function composeName(tokens: Token[], guessed: ReadonlySet<string>, typed: string): string {
  let i = 0
  return tokens
    .map((t) => {
      if (t.kind === 'nl') return ''
      if (t.kind === 'sym') return t.sym
      return isBlank(t, guessed) ? (typed[i++] ?? '') : t.ch
    })
    .join('')
    .toUpperCase()
}
