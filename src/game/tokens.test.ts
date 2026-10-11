import { describe, expect, it } from 'vitest'
import { charKey, isRevealed, symbolKeys, tokenize, type Token } from './tokens'

describe('charKey', () => {
  it('maps letters to uppercase keys and folds accents', () => {
    expect(charKey('a')).toBe('A')
    expect(charKey('Z')).toBe('Z')
    expect(charKey('û')).toBe('U')
    expect(charKey('É')).toBe('E')
  })
  it('maps digits and + - * (including the Unicode minus)', () => {
    expect(charKey('7')).toBe('7')
    expect(charKey('+')).toBe('+')
    expect(charKey('-')).toBe('-')
    expect(charKey('−')).toBe('-')
    expect(charKey('*')).toBe('*')
  })
  it('leaves punctuation and spaces visible', () => {
    for (const ch of [' ', ',', '.', "'", '—', '/', ':', '(', '"', '•']) expect(charKey(ch)).toBeNull()
  })
})

describe('symbolKeys', () => {
  it('maps basic symbols to their own key', () => {
    expect(symbolKeys('{G}')).toEqual({ keys: ['{G}'], all: false })
    expect(symbolKeys('{T}')).toEqual({ keys: ['{T}'], all: false })
    expect(symbolKeys('{C}')).toEqual({ keys: ['{C}'], all: false })
    expect(symbolKeys('{E}')).toEqual({ keys: ['{E}'], all: false })
  })
  it('needs every digit of a generic cost', () => {
    expect(symbolKeys('{3}')).toEqual({ keys: ['3'], all: true })
    expect(symbolKeys('{10}')).toEqual({ keys: ['1', '0'], all: true })
    expect(symbolKeys('{11}')).toEqual({ keys: ['1'], all: true })
  })
  it('maps {X} to the letter key', () => {
    expect(symbolKeys('{X}')).toEqual({ keys: ['X'], all: false })
  })
  it('reveals hybrids from any component', () => {
    expect(symbolKeys('{W/U}')).toEqual({ keys: ['{W}', '{U}'], all: false })
    expect(symbolKeys('{2/B}')).toEqual({ keys: ['2', '{B}'], all: false })
    expect(symbolKeys('{C/W}')).toEqual({ keys: ['{C}', '{W}'], all: false })
  })
  it('maps Phyrexian symbols to Phyrexian keys', () => {
    expect(symbolKeys('{G/P}')).toEqual({ keys: ['{G/P}'], all: false })
    expect(symbolKeys('{G/W/P}')).toEqual({ keys: ['{G/P}', '{W/P}'], all: false })
    expect(symbolKeys('{P}')).toEqual({ keys: ['{W/P}', '{U/P}', '{B/P}', '{R/P}', '{G/P}'], all: false })
  })
  it('returns no keys for symbols with no keyboard key', () => {
    expect(symbolKeys('{HW}')).toEqual({ keys: [], all: false })
    expect(symbolKeys('{½}')).toEqual({ keys: [], all: false })
  })
})

describe('tokenize', () => {
  it('splits symbols, characters and newlines', () => {
    const t = tokenize('{T}: Add {G}.\nHi')
    expect(t.map((x) => (x.kind === 'char' ? x.ch : x.kind === 'sym' ? x.sym : '⏎'))).toEqual([
      '{T}', ':', ' ', 'A', 'd', 'd', ' ', '{G}', '.', '⏎', 'H', 'i',
    ])
    expect(t[3]).toEqual({ kind: 'char', ch: 'A', key: 'A' })
    expect(t[1]).toEqual({ kind: 'char', ch: ':', key: null })
  })
  it('keeps surrogate pairs and odd characters as single visible tokens', () => {
    expect(tokenize('∞')).toEqual([{ kind: 'char', ch: '∞', key: null }])
  })
})

describe('isRevealed', () => {
  const g = (...k: string[]) => new Set(k)
  const sym = (s: string): Token => ({ kind: 'sym', sym: s, ...symbolKeys(s) })
  it('shows visible chars and guessed chars only', () => {
    expect(isRevealed({ kind: 'char', ch: ',', key: null }, g())).toBe(true)
    expect(isRevealed({ kind: 'char', ch: 'a', key: 'A' }, g())).toBe(false)
    expect(isRevealed({ kind: 'char', ch: 'a', key: 'A' }, g('A'))).toBe(true)
  })
  it('applies any/all symbol rules', () => {
    expect(isRevealed(sym('{10}'), g('1'))).toBe(false)
    expect(isRevealed(sym('{10}'), g('1', '0'))).toBe(true)
    expect(isRevealed(sym('{W/U}'), g('{U}'))).toBe(true)
    expect(isRevealed(sym('{HW}'), g())).toBe(true)
  })
  it('always shows newlines', () => {
    expect(isRevealed({ kind: 'nl' }, g())).toBe(true)
  })
})
