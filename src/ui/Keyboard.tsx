// On-screen keyboard: letters, plus a layer for digits, mana symbols and + - *.
import { useState, type MouseEvent } from 'react'
import { Sym, symLabel } from './Sym'

const LETTERS = [[...'QWERTYUIOP'], [...'ASDFGHJKL'], [...'ZXCVBNM']]
const SYMBOLS = [
  [...'1234567890'],
  ['{W}', '{U}', '{B}', '{R}', '{G}', '{W/P}', '{U/P}', '{B/P}', '{R/P}', '{G/P}'],
  ['{C}', '{T}', '{Q}', '{E}', '{S}', '+', '-', '*'],
]

// On-screen keys shouldn't take focus, or Enter would press the last key clicked.
const keepFocus = (e: MouseEvent) => e.preventDefault()

type Props = {
  results: ReadonlyMap<string, boolean> // key -> hit
  disabled: boolean
  onKey: (key: string) => void
}

export function Keyboard({ results, disabled, onKey }: Props) {
  const [layer, setLayer] = useState<'abc' | 'sym'>('abc')
  const rows = layer === 'abc' ? LETTERS : SYMBOLS

  const key = (k: string) => {
    const result = results.get(k)
    const state = result === undefined ? '' : result ? ' hit' : ' miss'
    const isSym = k.startsWith('{')
    return (
      <button
        key={k}
        type="button"
        className={`key${isSym ? ' key-sym' : ''}${state}`}
        disabled={disabled || result !== undefined}
        onMouseDown={keepFocus}
        onClick={() => onKey(k)}
        aria-label={`Guess ${isSym ? symLabel(k) : k}`}
      >
        {isSym ? <Sym sym={k} /> : k}
      </button>
    )
  }

  const toggle = (
    <button
      type="button"
      className="key key-toggle"
      onMouseDown={keepFocus}
      onClick={() => setLayer(layer === 'abc' ? 'sym' : 'abc')}
      aria-label={layer === 'abc' ? 'Show numbers and mana symbols' : 'Show letters'}
    >
      {layer === 'abc' ? (
        <>
          123 <i className="ms ms-cost ms-g" aria-hidden />
        </>
      ) : (
        'ABC'
      )}
    </button>
  )

  return (
    <div className="keyboard" role="group" aria-label="Guess a letter or symbol">
      {rows.map((row, i) => (
        <div className="key-row" key={`${layer}-${i}`}>
          {i === 2 && toggle}
          {row.map(key)}
        </div>
      ))}
    </div>
  )
}
