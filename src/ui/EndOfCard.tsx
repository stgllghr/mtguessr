// Shown in place of the keyboard once a card is solved or the tries run out.
import { edhrecUrl, scryfallUrl, type Card } from '../game/card'
import { triesLeft, type CardGame } from '../game/cardGame'

type Props = {
  card: Card
  game: CardGame
  streak: number
  best: number
  qa?: boolean // QA runs never end: every card moves on to the next
  onNext: () => void
  onPlayAgain: () => void
  onMenu: () => void
}

export function EndOfCard({ card, game, streak, best, qa, onNext, onPlayAgain, onMenu }: Props) {
  const used = game.guesses.length
  const won = game.status === 'won'
  const name = card.full ?? card.n
  return (
    <section className={`end ${won ? 'end-won' : 'end-lost'}`} aria-live="polite">
      <p className="end-kicker">
        {won ? `Solved in ${used} ${used === 1 ? 'try' : 'tries'}` : triesLeft(game) > 0 ? 'Revealed' : 'Out of tries'}
      </p>
      <h2 className="end-name">{name}</h2>
      <p className="end-links">
        <a href={edhrecUrl(card)} target="_blank" rel="noreferrer">
          View on EDHREC
        </a>
        <a href={scryfallUrl(card)} target="_blank" rel="noreferrer">
          Scryfall
        </a>
      </p>
      {won || qa ? (
        <div className="end-actions">
          <button type="button" className="btn btn-primary btn-wide" onClick={onNext} autoFocus>
            Next card
          </button>
        </div>
      ) : (
        <>
          <p className="end-run">
            Run over with a streak of <strong>{streak}</strong>.
            {streak > 0 && streak >= best ? " That's your best." : best > 0 ? ` Your best is ${best}.` : ''}
          </p>
          <div className="end-actions">
            <button type="button" className="btn" onClick={onMenu}>
              Change pool
            </button>
            <button type="button" className="btn btn-primary" onClick={onPlayAgain} autoFocus>
              Play again
            </button>
          </div>
        </>
      )}
    </section>
  )
}
