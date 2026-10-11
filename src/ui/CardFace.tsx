// The masked card. When the card is over it flips to the real Scryfall image.
import { useEffect, useState, type CSSProperties } from 'react'
import { imageUrl, type Card } from '../game/card'
import type { CardView } from '../game/cardGame'
import { TokenText } from './TokenText'
import { useFit } from './useFit'

type Props = {
  card: Card
  view: CardView
  guessed: ReadonlySet<string>
  fresh: string | null
  hard: boolean
  over: boolean
}

function frameOf(card: Card, hard: boolean): string {
  if (hard) return 'hidden'
  if (card.c.length > 1) return 'gold'
  if (card.c.length === 1) return card.c.toLowerCase()
  return /\bLand\b/.test(card.t) ? 'land' : 'artifact'
}

export function CardFace({ card, view, guessed, fresh, hard, over }: Props) {
  const [flipped, setFlipped] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const version = guessed.size + (over ? 100 : 0)
  const [nameRef, nameScale] = useFit<HTMLSpanElement>(version, 'x')
  const [textRef, textScale] = useFit<HTMLDivElement>(version, 'y', 0.5)

  useEffect(() => {
    if (!over) return
    const t = setTimeout(() => setFlipped(true), 650)
    return () => clearTimeout(t)
  }, [over])

  const canFlip = over && !imageFailed
  const shared = { guessed, fresh, reveal: over }
  const name = card.full ?? card.n

  return (
    <div className={`card-flip${flipped && canFlip ? ' is-flipped' : ''}`}>
      <button
        type="button"
        className="card-inner"
        disabled={!canFlip}
        onClick={() => setFlipped((f) => !f)}
        aria-label={canFlip ? (flipped ? 'Show the guessing card' : 'Show the real card') : 'Hidden card'}
      >
        <div className={`card face frame-${frameOf(card, hard)}${over ? '' : ' masked'}`} aria-hidden={flipped && canFlip}>
          <div className="frame">
            <div className="bar name-bar">
              <span className="name" ref={nameRef} style={{ '--fit': nameScale } as CSSProperties}>
                <TokenText tokens={view.name} {...shared} />
              </span>
              <span className="cost">
                <TokenText tokens={view.cost} {...shared} />
              </span>
            </div>
            <div className="art" />
            <div className="bar type-bar">
              <TokenText tokens={view.types} {...shared} />
            </div>
            <div className="textbox" ref={textRef} style={{ '--fit': textScale } as CSSProperties}>
              <div className="rules">
                <TokenText tokens={view.text} paragraphs reminder {...shared} />
              </div>
              {view.flavor.length > 0 && (
                <div className="flavor">
                  <TokenText tokens={view.flavor} paragraphs {...shared} />
                </div>
              )}
            </div>
          </div>
          {view.stats && (
            <div className="stats">
              <TokenText tokens={view.stats} {...shared} />
            </div>
          )}
          {view.artist.length > 0 && (
            <div className="artist">
              <span className="brush" aria-hidden>
                ✎
              </span>{' '}
              <TokenText tokens={view.artist} {...shared} />
            </div>
          )}
        </div>
        <div className="card back" aria-hidden={!(flipped && canFlip)}>
          <img src={imageUrl(card.id)} alt={flipped && canFlip ? name : ''} onError={() => setImageFailed(true)} />
        </div>
      </button>
      {canFlip && <p className="flip-hint">Tap the card to flip it</p>}
    </div>
  )
}
