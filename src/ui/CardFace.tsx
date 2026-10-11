// The card in play: masked faces you can rotate and turn over, like a card in your hand.
// When the card ends, each side's blanks fill in and then develop into the real Scryfall image.
import { useEffect, useState, type MouseEvent } from 'react'
import { imageUrl, type Card } from '../game/card'
import type { CardView } from '../game/cardGame'
import { Artist, CardBack, FaceFrame, Stats } from './frames'
import { MaskContext } from './TokenText'

// Card tools shouldn't keep focus, or Enter would press them instead of naming the card.
const keepFocus = (e: MouseEvent) => e.preventDefault()

type Props = {
  card: Card
  view: CardView
  guessed: ReadonlySet<string>
  fresh: string | null
  hard: boolean
  over: boolean
}

function Side({ card, view, index, hard, over }: { card: Card; view: CardView; index: number; hard: boolean; over: boolean }) {
  const [developed, setDeveloped] = useState(false)
  const [failed, setFailed] = useState(false)
  const face = view.faces[index]
  const cardStats = face.kind !== 'battle' && !['split', 'aftermath', 'flip'].includes(view.layout)

  useEffect(() => {
    if (!over) return
    const t = setTimeout(() => setDeveloped(true), 650)
    return () => clearTimeout(t)
  }, [over])

  return (
    <>
      <div className={`card face${over ? '' : ' masked'}`}>
        <div className="face-content">
          <FaceFrame view={view} index={index} hard={hard} />
        </div>
        {cardStats && <Stats face={face} />}
        <Artist face={face} />
      </div>
      {!failed && (
        <img
          className={`real${developed ? ' developed' : ''}`}
          src={imageUrl(card.id, index === 0 ? 'front' : 'back')}
          alt={developed ? (index === 0 ? card.full ?? card.n : face.face.n) : ''}
          onError={() => setFailed(true)}
        />
      )}
    </>
  )
}

export function CardFace({ card, view, guessed, fresh, hard, over }: Props) {
  const [turns, setTurns] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const twoSided = view.layout === 'dfc' && view.faces.length > 1
  const sideways = turns % 2 === 1

  return (
    <MaskContext.Provider value={{ guessed, fresh, reveal: over, version: guessed.size + (over ? 100 : 0) }}>
      <div className="card-area">
        <div className={`card-slot${sideways ? ' turned' : ''}`}>
          <div className="card-flip" style={{ rotate: `${turns * 90}deg` }}>
            <div className={`card-inner${flipped ? ' is-flipped' : ''}`}>
              <div className="side side-front" aria-hidden={flipped}>
                <Side card={card} view={view} index={0} hard={hard} over={over} />
              </div>
              <div className="side side-back" aria-hidden={!flipped}>
                {twoSided ? <Side card={card} view={view} index={1} hard={hard} over={over} /> : <CardBack />}
              </div>
            </div>
          </div>
        </div>
        <div className="card-tools">
          <button type="button" className="tool" onMouseDown={keepFocus} onClick={() => setTurns((t) => t + 1)}>
            <span aria-hidden>↻</span> Rotate
          </button>
          <button type="button" className="tool" onMouseDown={keepFocus} onClick={() => setFlipped((f) => !f)} aria-pressed={flipped}>
            <span aria-hidden>⇄</span> {flipped ? 'Back to front' : 'Check other side'}
          </button>
        </div>
      </div>
    </MaskContext.Provider>
  )
}
