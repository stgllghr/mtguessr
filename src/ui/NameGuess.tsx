// "Guess the card": type the whole name into the card name's boxes. Letters already revealed
// on the card show faintly behind their boxes; nothing is skipped or filled in for you.
// No suggestions, so the dialog gives away nothing the card doesn't already show.
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type SyntheticEvent } from 'react'
import { composeName, entryKeys, isSlot, slotCount } from '../game/nameEntry'
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
  const total = slotCount(tokens)
  const [typed, setTyped] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const complete = typed.length === total
  const words = splitWords(tokens)
  // Size the boxes so the whole name fits on one line, like the card's name bar.
  const all = words.flat()
  const boxes = all.filter(isSlot).length
  const punct = all.length - boxes
  const units = boxes + punct * 0.4 + (words.length - 1) * 0.8

  useEffect(() => inputRef.current?.focus(), [])

  const submit = () => {
    if (complete) onGuess(composeName(tokens, typed))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
  }

  let box = 0
  const cell = (t: Token, i: number) => {
    if (isSlot(t) && t.kind === 'char') {
      const index = box++
      const ch = typed[index]
      const known = isRevealed(t, guessed)
      const mismatch = ch !== undefined && known && ch !== t.key
      const cls = `cell${ch ? ' filled' : ''}${index === typed.length ? ' next' : ''}${mismatch ? ' mismatch' : ''}`
      return (
        <span key={i} className={cls}>
          {ch ?? (known && <span className="hint">{t.ch.toUpperCase()}</span>)}
        </span>
      )
    }
    if (t.kind === 'char') {
      return (
        <span key={i} className="cell-punct">
          {t.ch}
        </span>
      )
    }
    return (
      <span key={i} className="cell fixed">
        {t.kind === 'sym' ? <Sym sym={t.sym} /> : null}
      </span>
    )
  }

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="name-guess-title">
        <h2 id="name-guess-title">Guess the card</h2>
        <p className="dialog-note">
          Type the whole name. A guess costs 1 of your {tries} {tries === 1 ? 'try' : 'tries'}.
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
            onChange={(e) => setTyped(entryKeys(e.target.value, total))}
            onKeyDown={onKeyDown}
            onSelect={caretToEnd}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-label={`Card name: ${typed.length} of ${total} letters typed`}
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
