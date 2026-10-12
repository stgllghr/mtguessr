// Tries left (counted down like a life total) and the history of every guess.
import { ART_HINT_COST, MAX_ART_HINTS } from '../game/artHints'
import { artHints, canUseArtHint, guessCost, triesLeft, type CardGame, type Guess } from '../game/cardGame'
import { Sym, symLabel } from './Sym'

type Props = { game: CardGame; onGuessName: () => void; onArtHint: () => void }

function label(g: Guess): string {
  if (g.type === 'art') return `Art hint: ${ART_HINT_COST} tries`
  if (g.type === 'name') return `Named ${g.text}: ${g.hit ? 'correct' : 'wrong'}`
  return `${g.key.startsWith('{') ? symLabel(g.key) : g.key}: ${g.hit ? 'on the card' : 'not on the card'}`
}

function content(g: Guess) {
  if (g.type === 'art') return <span className="art-glyph" aria-hidden />
  if (g.type === 'name') return <span className="name-glyph" aria-hidden />
  return g.key.startsWith('{') ? <Sym sym={g.key} /> : g.key
}

export function GuessBar({ game, onGuessName, onArtHint }: Props) {
  const left = triesLeft(game)
  const used = artHints(game)
  const wrongNames = game.guesses.flatMap((g) => (g.type === 'name' && !g.hit ? [g.text] : []))
  return (
    <section className="tries" aria-label="Guesses">
      <div className="tries-top">
        <p className="life" aria-live="polite">
          <span className="life-num">{left}</span>
          <span className="life-label">{left === 1 ? 'try left' : 'tries left'}</span>
        </p>
        <div className="tries-actions">
          <button type="button" className="btn btn-hint" onClick={onArtHint} disabled={!canUseArtHint(game)} onMouseDown={(e) => e.preventDefault()}>
            Art hint
            <span className="btn-note">
              {used >= MAX_ART_HINTS ? 'All used' : `${ART_HINT_COST} tries · ${used}/${MAX_ART_HINTS}`}
            </span>
          </button>
          <button type="button" className="btn btn-primary" onClick={onGuessName} disabled={game.status !== 'playing'}>
            Guess the card
          </button>
        </div>
      </div>
      <ol className="slots">
        {game.guesses.map((g, i) => (
          <li
            key={i}
            className={`slot-cell ${g.type === 'art' ? 'art-hint' : g.hit ? 'hit' : 'miss'}`}
            style={{ gridColumn: `span ${guessCost(g)}` }}
            title={label(g)}
            aria-label={label(g)}
          >
            {content(g)}
          </li>
        ))}
        {Array.from({ length: Math.max(0, left) }, (_, i) => (
          <li key={`empty-${i}`} className="slot-cell" />
        ))}
      </ol>
      {wrongNames.length > 0 && (
        <p className="wrong-names">
          Not{' '}
          {wrongNames.map((n, i) => (
            <s key={i}>{n}</s>
          ))}
        </p>
      )}
    </section>
  )
}

