// Tries left (counted down like a life total) and the history of every guess.
import { MAX_TRIES, triesLeft, type CardGame } from '../game/cardGame'
import { Sym, symLabel } from './Sym'

export function GuessBar({ game, onGuessName }: { game: CardGame; onGuessName: () => void }) {
  const left = triesLeft(game)
  const wrongNames = game.guesses.flatMap((g) => (g.type === 'name' && !g.hit ? [g.text] : []))
  return (
    <section className="tries" aria-label="Guesses">
      <div className="tries-top">
        <p className="life" aria-live="polite">
          <span className="life-num">{left}</span>
          <span className="life-label">{left === 1 ? 'try left' : 'tries left'}</span>
        </p>
        <button type="button" className="btn btn-primary" onClick={onGuessName} disabled={game.status !== 'playing'}>
          Guess the card
        </button>
      </div>
      <ol className="slots">
        {Array.from({ length: MAX_TRIES }, (_, i) => {
          const g = game.guesses[i]
          if (!g) return <li key={i} className="slot-cell" />
          const label =
            g.type === 'name'
              ? `Named ${g.text}: ${g.hit ? 'correct' : 'wrong'}`
              : `${g.key.startsWith('{') ? symLabel(g.key) : g.key}: ${g.hit ? 'on the card' : 'not on the card'}`
          return (
            <li key={i} className={`slot-cell ${g.hit ? 'hit' : 'miss'}`} title={label} aria-label={label}>
              {g.type === 'name' ? <span className="name-glyph" aria-hidden /> : g.key.startsWith('{') ? <Sym sym={g.key} /> : g.key}
            </li>
          )
        })}
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
