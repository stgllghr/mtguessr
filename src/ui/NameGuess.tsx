// "Guess the card" dialog with autocomplete over card names.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { normalizeName } from '../game/card'

export type NameIndex = { name: string; norm: string }[]

type Props = { index: NameIndex; tries: number; onGuess: (name: string) => void; onClose: () => void }

function suggest(index: NameIndex, query: string): string[] {
  const q = normalizeName(query)
  if (q.length < 2) return []
  const starts: string[] = []
  const contains: string[] = []
  for (const { name, norm } of index) {
    if (norm.startsWith(q)) starts.push(name)
    else if (contains.length < 8 && norm.includes(q)) contains.push(name)
    if (starts.length >= 8) break
  }
  return [...starts, ...contains].slice(0, 8)
}

export function NameGuess({ index, tries, onGuess, onClose }: Props) {
  const [text, setText] = useState('')
  const [active, setActive] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const options = useMemo(() => suggest(index, text), [index, text])

  useEffect(() => inputRef.current?.focus(), [])

  const submit = (name: string) => {
    if (name.trim()) onGuess(name)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown' && options.length) {
      e.preventDefault()
      setActive((a) => (a + 1) % options.length)
    } else if (e.key === 'ArrowUp' && options.length) {
      e.preventDefault()
      setActive((a) => (a <= 0 ? options.length - 1 : a - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      submit(active >= 0 ? options[active] : text)
    }
  }

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="name-guess-title">
        <h2 id="name-guess-title">Guess the card</h2>
        <p className="dialog-note">
          A guess costs 1 of your {tries} {tries === 1 ? 'try' : 'tries'}.
        </p>
        <input
          ref={inputRef}
          className="name-input"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setActive(-1)
          }}
          onKeyDown={onKeyDown}
          placeholder="Card name"
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          role="combobox"
          aria-expanded={options.length > 0}
          aria-controls="name-options"
          aria-activedescendant={active >= 0 ? `name-opt-${active}` : undefined}
        />
        {options.length > 0 && (
          <ul className="options" id="name-options" role="listbox">
            {options.map((o, i) => (
              <li
                key={o}
                id={`name-opt-${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'active' : ''}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => submit(o)}
              >
                {o}
              </li>
            ))}
          </ul>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => submit(text)} disabled={!text.trim()}>
            Guess
          </button>
        </div>
      </div>
    </div>
  )
}
