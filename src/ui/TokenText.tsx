// Renders tokens with hidden characters as blank slots. Words never break across lines.
import { Fragment, type CSSProperties, type ReactNode } from 'react'
import { isRevealed, type Token } from '../game/tokens'
import { Sym } from './Sym'

type Props = {
  tokens: Token[]
  guessed: ReadonlySet<string>
  fresh: string | null // the latest guess; its reveals get the ink-in animation
  reveal: boolean // show everything (card is over)
  paragraphs?: boolean
  reminder?: boolean // italicize (parenthesized reminder text)
}

function split<T>(items: T[], isBreak: (t: T) => boolean): T[][] {
  const out: T[][] = [[]]
  for (const t of items) isBreak(t) ? out.push([]) : out[out.length - 1].push(t)
  return out
}

export function TokenText({ tokens, guessed, fresh, reveal, paragraphs, reminder }: Props) {
  let freshIndex = 0
  let depth = 0

  const renderToken = (t: Token, i: number): ReactNode => {
    if (t.kind === 'nl') return null
    if (!reveal && !isRevealed(t, guessed)) return <span key={i} className={t.kind === 'sym' ? 'slot-sym' : 'slot'} />
    const content = t.kind === 'sym' ? <Sym sym={t.sym} /> : t.ch
    const isFresh = !reveal && fresh !== null && (t.kind === 'char' ? t.key === fresh : t.keys.includes(fresh))
    if (!isFresh) return <Fragment key={i}>{content}</Fragment>
    return (
      <span key={i} className="fresh" style={{ '--i': freshIndex++ } as CSSProperties}>
        {content}
      </span>
    )
  }

  const renderLine = (line: Token[]) =>
    split(line, (t) => t.kind === 'char' && t.ch === ' ').map((word, wi) => {
      const italic = reminder && (depth > 0 || word.some((t) => t.kind === 'char' && t.ch === '('))
      for (const t of word) {
        if (t.kind !== 'char') continue
        if (t.ch === '(') depth++
        if (t.ch === ')') depth = Math.max(0, depth - 1)
      }
      return (
        <Fragment key={wi}>
          {wi > 0 && ' '}
          <span className={italic ? 'w rem' : 'w'}>{word.map(renderToken)}</span>
        </Fragment>
      )
    })

  const lines = split(tokens, (t) => t.kind === 'nl')
  if (!paragraphs) return <>{lines.map((l, i) => <Fragment key={i}>{renderLine(l)}</Fragment>)}</>
  return (
    <>
      {lines.map((l, i) => (
        <p key={i}>{renderLine(l)}</p>
      ))}
    </>
  )
}
