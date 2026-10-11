// "Guess the card": type into the card name's blanks. No suggestions, so the dialog gives
// away nothing the card doesn't already show.
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type SyntheticEvent } from 'react'
import { composeName, hiddenSlots, sanitizeEntry } from '../game/nameEntry'
import { isRevealed, type Token } from '../game/tokens'
import { Sym } from './Sym'

type Props = {
  tokens: Token[] // the card name
  guessed: ReadonlySet<string>
  tries: number
  onGuess: (name: string) => void
  onClose: () => void
}

function splitWords(tokens: Token[]): Token[][] {
  const words: Token[][] = [[]]
  for (const t of tokens) {
    if (t.kind === 'char' && t.ch === ' ') words.push([])
    else if (t.kind !== 'nl') words[words.length - 1].push(t)
  }
  return words.filter((w) => w.length > 0)
}

// Typing only ever appends or deletes at the end, so keep the caret there.
function caretToEnd(e: SyntheticEvent<HTMLInputElement>) {
  const el = e.currentTarget
  const end = el.value.length
  if (el.selectionStart !== end || el.selectionEnd !== end) el.setSelectionRange(end, end)
}

export function NameGuess({ tokens, guessed, tries, onGuess, onClose }: Props) {
  const total = hiddenSlots(tokens, guessed)
  const [typed, setTyped] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const complete = typed.length === total
  const words = splitWords(tokens)
  // Size the boxes so the whole name fits on one line, like the card's name bar.
  const all = words.flat()
  const punct = all.filter((t) => t.kind === 'char' && t.key === null).length
  const boxes = all.length - punct
  const units = boxes + punct * 0.4 + (words.length - 1) * 0.8

  useEffect(() => inputRef.current?.focus(), [])

  const submit = () => {
    if (complete) onGuess(composeName(tokens, guessed, typed))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
  }

  let blank = 0
  const cell = (t: Token, i: number) => {
    if (t.kind === 'char' && !isRevealed(t, guessed)) {
      const index = blank++
      const ch = typed[index]
      const cls = `cell${ch ? ' filled' : ''}${index === typed.length ? ' next' : ''}`
      return (
        <span key={i} className={cls}>
          {ch ?? ''}
        </span>
      )
    }
    if (t.kind === 'char' && t.key === null) {
      return (
        <span key={i} className="cell-punct">
          {t.ch}
        </span>
      )
    }
    return (
      <span key={i} className="cell fixed">
        {t.kind === 'char' ? t.ch.toUpperCase() : t.kind === 'sym' ? <Sym sym={t.sym} /> : null}
      </span>
    )
  }

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="name-guess-title">
        <h2 id="name-guess-title">Guess the card</h2>
        <p className="dialog-note">
          Fill in the blanks. A guess costs 1 of your {tries} {tries === 1 ? 'try' : 'tries'}.
        </p>
        <div className="entry" style={{ '--boxes': boxes, '--units': units } as CSSProperties}>
          {words.map((w, i) => (
            <span key={i} className="entry-word">
              {w.map(cell)}
            </span>
          ))}
          <input
            ref={inputRef}
            className="entry-input"
            value={typed}
            onChange={(e) => setTyped(sanitizeEntry(e.target.value, total))}
            onKeyDown={onKeyDown}
            onSelect={caretToEnd}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-label={`Card name: ${typed.length} of ${total} blanks filled`}
          />
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={!complete}>
            Guess
          </button>
        </div>
      </div>
    </div>
  )
}
