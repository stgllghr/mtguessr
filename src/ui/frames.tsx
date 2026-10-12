// Masked card frames, one per printed layout. Every size is in cqw (card widths), so the
// frames scale with the card, and rotated parts reuse the same pieces.
import { useContext, type CSSProperties, type ReactNode } from 'react'
import { hybridPair, type Face } from '../game/card'
import type { CardView, FaceView, InfoLine as Info, Section } from '../game/cardGame'
import { MaskContext, TokenText } from './TokenText'
import { useFit } from './useFit'

/** The frame color classes for a face: one color, gold, a two-tone hybrid, or neutral in hard mode. */
export function frameOf(face: Face, hard: boolean): string {
  if (hard) return 'frame-hidden'
  const hybrid = hybridPair(face)
  if (hybrid) return `frame-hybrid frame-a-${hybrid[0].toLowerCase()} frame-b-${hybrid[1].toLowerCase()}`
  if (face.c.length > 1) return 'frame-gold'
  if (face.c.length === 1) return `frame-${face.c.toLowerCase()}`
  return /\bLand\b/.test(face.t) ? 'frame-land' : 'frame-artifact'
}

/** A box whose text shrinks until it stops overflowing, like printed cards do. */
function Fit({ axis, min, className, children }: { axis: 'x' | 'y'; min: number; className: string; children: ReactNode }) {
  const { version } = useContext(MaskContext)
  const [ref, scale] = useFit<HTMLDivElement>(version, axis, min)
  return (
    <div ref={ref} className={className} style={{ '--fit': scale } as CSSProperties}>
      {children}
    </div>
  )
}

function NameBar({ face }: { face: FaceView }) {
  return (
    <div className="bar name-bar">
      <Fit axis="x" min={0.4} className="name">
        <TokenText tokens={face.name} />
      </Fit>
      <span className="cost">
        <TokenText tokens={face.cost} />
      </span>
    </div>
  )
}

function TypeBar({ face, stats }: { face: FaceView; stats?: boolean }) {
  return (
    <div className="bar type-bar">
      <Fit axis="x" min={0.45} className="types">
        <TokenText tokens={face.types} />
      </Fit>
      {stats && face.stats && (
        <span className="bar-stats">
          <TokenText tokens={face.stats} />
        </span>
      )}
    </div>
  )
}

function SectionBlock({ section }: { section: Section }) {
  const text = <TokenText tokens={section.tokens} reminder />
  switch (section.kind) {
    case 'plain':
      return <p>{text}</p>
    case 'level':
      return (
        <div className="level-bar">
          <span className="level-cost">
            <TokenText tokens={section.badge!} />
          </span>
          <span className="level-name">{text}</span>
        </div>
      )
    default:
      return (
        <div className={`badged ${section.kind}`}>
          <span className="badge">
            <TokenText tokens={section.badge!} />
          </span>
          <p>{text}</p>
        </div>
      )
  }
}

function Rules({ face, flavor = true }: { face: FaceView; flavor?: boolean }) {
  return (
    <>
      <div className="rules">
        {face.sections.map((s, i) => (
          <SectionBlock key={i} section={s} />
        ))}
      </div>
      {flavor && face.flavor.length > 0 && (
        <div className="flavor">
          <TokenText tokens={face.flavor} paragraphs />
        </div>
      )}
    </>
  )
}

function TextBox({ face, className = '' }: { face: FaceView; className?: string }) {
  return (
    <Fit axis="y" min={0.4} className={`textbox ${className}`}>
      <Rules face={face} />
    </Fit>
  )
}

export function Stats({ face }: { face: FaceView }) {
  if (!face.stats) return null
  const shield = face.kind === 'planeswalker' || face.kind === 'battle'
  return (
    <div className={`stats${shield ? ' shield' : ''}`}>
      <TokenText tokens={face.stats} />
    </div>
  )
}

/** The printed line at the bottom left: rarity and collector number, then set code and artist. */
export function InfoLine({ info, face }: { info: Info | null; face: FaceView }) {
  if (!info && face.artist.length === 0) return null
  return (
    <Fit axis="x" min={0.6} className="info">
      {info && (
        <div className="info-row">
          <TokenText tokens={info.rarity} /> <TokenText tokens={info.number} />
        </div>
      )}
      <div className="info-row">
        {info && (
          <>
            <TokenText tokens={info.set} /> <span aria-hidden>•</span>{' '}
          </>
        )}
        {face.artist.length > 0 && (
          <>
            <span className="brush" aria-hidden>
              ✎
            </span>{' '}
            <TokenText tokens={face.artist} />
          </>
        )}
      </div>
    </Fit>
  )
}

/** A single upright face. `inset` puts an adventure/prepared spell panel in the text box. */
function Upright({ face, hard, inset }: { face: FaceView; hard: boolean; inset?: { face: FaceView; side: 'left' | 'right' } }) {
  const frame = `frame ${frameOf(face.face, hard)} kind-${face.kind}`
  if (face.kind === 'saga' || face.kind === 'class') {
    return (
      <div className={frame}>
        <NameBar face={face} />
        <div className="tall-body">
          {face.kind === 'class' && <div className="art" />}
          <TextBox face={face} />
          {face.kind === 'saga' && <div className="art" />}
        </div>
        <TypeBar face={face} />
      </div>
    )
  }
  // The spell panel has its own frame color: a black creature can carry a red adventure.
  const panel = inset && (
    <div className={`inset ${frameOf(inset.face.face, hard)}`}>
      <div className="bar name-bar inset-bar">
        <Fit axis="x" min={0.4} className="name">
          <TokenText tokens={inset.face.name} />
        </Fit>
        <span className="cost">
          <TokenText tokens={inset.face.cost} />
        </span>
      </div>
      <div className="bar type-bar inset-bar">
        <Fit axis="x" min={0.45} className="types">
          <TokenText tokens={inset.face.types} />
        </Fit>
      </div>
      <TextBox face={inset.face} className="inset-text" />
    </div>
  )
  return (
    <div className={frame}>
      <NameBar face={face} />
      <div className="art" />
      <TypeBar face={face} />
      {panel ? (
        <div className="split-box">
          {inset.side === 'left' && panel}
          <TextBox face={face} />
          {inset.side === 'right' && panel}
        </div>
      ) : (
        <TextBox face={face} />
      )}
    </div>
  )
}

/** A face printed sideways: laid out upright in a box of the given size, then rotated into place. */
function Sideways({ turn, width, height, children }: { turn: 90 | -90; width: number; height: number; children: ReactNode }) {
  return (
    <div className="sideways" style={{ width: `${width}cqw`, height: `${height}cqw`, transform: `translate(-50%, -50%) rotate(${turn}deg)` }}>
      {children}
    </div>
  )
}

// Inner area of a card (inside the black border), in cqw.
const INNER_W = 91.6
const INNER_H = 127.9

/** One face of the card, laid out the way it is printed. */
export function FaceFrame({ view, index, hard }: { view: CardView; index: number; hard: boolean }) {
  const face = view.faces[index]
  const other = view.faces[1]

  if (index === 0 && (view.layout === 'split' || view.layout === 'aftermath') && other) {
    if (view.layout === 'split') {
      return (
        <Sideways turn={-90} width={INNER_H} height={INNER_W}>
          <div className="halves">
            <Upright face={face} hard={hard} />
            <Upright face={other} hard={hard} />
          </div>
        </Sideways>
      )
    }
    return (
      <div className="aftermath">
        <Upright face={face} hard={hard} />
        <div className="aftermath-bottom">
          <Sideways turn={90} width={INNER_H * 0.44} height={INNER_W}>
            <Upright face={other} hard={hard} />
          </Sideways>
        </div>
      </div>
    )
  }

  if (index === 0 && view.layout === 'flip' && other) {
    const half = (f: FaceView) => (
      <div className="flip-half">
        <NameBar face={f} />
        <TextBox face={f} />
        <TypeBar face={f} stats />
      </div>
    )
    return (
      <div className={`frame ${frameOf(face.face, hard)} flip-frame`}>
        {half(face)}
        <div className="art" />
        <div className="upside-down">{half(other)}</div>
      </div>
    )
  }

  if (index === 0 && (view.layout === 'adventure' || view.layout === 'prepare') && other) {
    return <Upright face={face} hard={hard} inset={{ face: other, side: view.layout === 'adventure' ? 'left' : 'right' }} />
  }

  if (face.kind === 'battle') {
    return (
      <Sideways turn={-90} width={INNER_H} height={INNER_W}>
        <div className={`frame ${frameOf(face.face, hard)} battle-frame`}>
          <NameBar face={face} />
          <div className="art" />
          <TypeBar face={face} />
          <TextBox face={face} />
          <Stats face={face} />
        </div>
      </Sideways>
    )
  }

  return <Upright face={face} hard={hard} />
}

/** The plain back of a Magic card, in our own colors: shown for cards without a printed back face. */
export function CardBack() {
  return (
    <div className="card card-back" aria-label="Card back">
      <div className="card-back-oval">
        <span>Spellify</span>
      </div>
      <div className="card-back-pips" aria-hidden>
        <i className="ms ms-cost ms-w" />
        <i className="ms ms-cost ms-u" />
        <i className="ms ms-cost ms-b" />
        <i className="ms ms-cost ms-r" />
        <i className="ms ms-cost ms-g" />
      </div>
    </div>
  )
}
