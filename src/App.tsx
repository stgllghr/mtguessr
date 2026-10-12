import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Card } from './game/card'
import { buildView, guessedKeys, triesLeft } from './game/cardGame'
import {
  POOLS,
  applyGuess,
  bestKey,
  currentCard,
  isRun,
  newSeed,
  nextCard,
  poolSize,
  recordBest,
  revealCard,
  skipCard,
  startRun,
  type Bests,
  type Pool,
  type Run,
  type Settings,
} from './game/run'
import { qaCategory } from './game/qa'
import { load, save } from './game/storage'
import { charKey } from './game/tokens'
import { CardFace } from './ui/CardFace'
import { EndOfCard } from './ui/EndOfCard'
import { GuessBar } from './ui/GuessBar'
import { Keyboard } from './ui/Keyboard'
import { settingsLabel } from './ui/labels'
import { NameGuess } from './ui/NameGuess'
import { StartScreen } from './ui/StartScreen'

// QA mode (only cards with special frames) is offered behind a hidden link: add ?qa to the address.
const QA = typeof location !== 'undefined' && new URLSearchParams(location.search).has('qa')
const CHOOSABLE: readonly Pool[] = QA ? [...POOLS, 'qa'] : POOLS
// Every card is needed for the full catalog, and for QA (rare frames are mostly outside the top 10,000).
const needsAllCards = (pool: Pool) => pool === 'all' || pool === 'qa'

const KEYS = { settings: 'spellify-endless:settings', bests: 'spellify-endless:bests', run: 'spellify-endless:run' }

async function fetchCards(file: string): Promise<Card[]> {
  const res = await fetch(`/${file}`)
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`)
  return res.json()
}

function loadSettings(): Settings {
  const s = load<Partial<Settings> | null>(KEYS.settings, null)
  return s && CHOOSABLE.includes(s.pool as Pool) && typeof s.hard === 'boolean' ? (s as Settings) : { pool: 500, hard: false }
}

function loadRun(): Run | null {
  const r = load<unknown>(KEYS.run, null)
  return isRun(r) && CHOOSABLE.includes(r.settings.pool) ? r : null
}

export default function App() {
  const [top, setTop] = useState<Card[] | null>(null)
  const [rest, setRest] = useState<Card[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [settings, setSettings] = useState(loadSettings)
  const [bests, setBests] = useState<Bests>(() => load(KEYS.bests, {}))
  const [run, setRun] = useState<Run | null>(loadRun)
  const [screen, setScreen] = useState<'start' | 'play'>(() => ((loadRun()?.game.status ?? 'lost') !== 'lost' ? 'play' : 'start'))
  const [naming, setNaming] = useState(false)
  const restRequest = useRef<Promise<Card[]> | null>(null)

  useEffect(() => {
    fetchCards('cards-top.json')
      .then(setTop)
      .catch(() => setError('The card list did not load. Check your connection, then reload the page.'))
  }, [])

  const loadRest = useCallback(() => {
    restRequest.current ??= fetchCards('cards-rest.json').then(
      (r) => {
        setRest(r)
        return r
      },
      (e) => {
        restRequest.current = null
        setError('The full card list did not load. Check your connection, then reload the page.')
        throw e
      },
    )
    return restRequest.current
  }, [])

  const allCards = useMemo(() => (top && rest ? top.concat(rest) : null), [top, rest])
  const cards = run ? (needsAllCards(run.settings.pool) ? allCards : top) : null
  const card = run && cards ? currentCard(run, cards) : null
  const view = useMemo(() => (card ? buildView(card) : null), [card])

  // A saved "Any card" run needs the full list before it can show its card.
  useEffect(() => {
    if (screen === 'play' && run && needsAllCards(run.settings.pool) && !rest) loadRest().catch(() => {})
  }, [screen, run?.settings.pool, rest, loadRest])

  // Card data changed under a saved run (e.g. after refreshing the snapshot): start over.
  useEffect(() => {
    if (run && cards && !card) {
      setRun(null)
      setScreen('start')
    }
  }, [run, cards, card])

  useEffect(() => save(KEYS.settings, settings), [settings])
  useEffect(() => save(KEYS.run, run), [run])
  useEffect(() => save(KEYS.bests, bests), [bests])
  useEffect(() => {
    if (run) setBests((b) => recordBest(b, run))
  }, [run])

  const begin = async (s: Settings) => {
    setSettings(s)
    if (needsAllCards(s.pool)) {
      setBusy(true)
      try {
        await loadRest()
      } catch {
        return
      } finally {
        setBusy(false)
      }
    }
    setRun(startRun(s, newSeed()))
    setNaming(false)
    setScreen('play')
  }

  const guess = useCallback(
    (g: { key: string } | { name: string }) => setRun((r) => (r && cards ? applyGuess(r, cards, g) : r)),
    [cards],
  )
  const next = useCallback(() => setRun((r) => (r && cards ? nextCard(r, cards) : r)), [cards])
  const skip = useCallback(() => setRun((r) => (r && cards ? skipCard(r, cards) : r)), [cards])
  const status = run?.game.status

  // Physical keyboard: type to guess, Enter to name the card / continue.
  useEffect(() => {
    if (screen !== 'play' || naming || !run) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.target instanceof HTMLInputElement) return
      if (e.key === 'Enter') {
        if (document.activeElement instanceof HTMLButtonElement || document.activeElement instanceof HTMLAnchorElement) return
        e.preventDefault()
        if (status === 'playing') setNaming(true)
        else if (status === 'won') next()
        else if (run.settings.pool === 'qa') skip()
        else begin(run.settings)
        return
      }
      if (status !== 'playing' || e.key.length !== 1) return
      const key = charKey(e.key)
      if (key) {
        e.preventDefault()
        guess({ key })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (error) return <Message title="Something went wrong" body={error} />
  if (!top) return <Message title="Shuffling the deck…" />

  if (screen === 'start' || !run) {
    return (
      <StartScreen
        pools={CHOOSABLE}
        settings={settings}
        onSettings={setSettings}
        bests={bests}
        saved={run && run.game.status !== 'lost' ? run : null}
        allCount={allCards?.length ?? null}
        busy={busy}
        onPlay={() => begin(settings)}
        onResume={() => setScreen('play')}
      />
    )
  }

  if (!card || !view) return <Message title="Loading every card…" />

  const guessed = guessedKeys(run.game)
  const results = new Map(run.game.guesses.flatMap((g) => (g.type === 'key' ? [[g.key, g.hit] as const] : [])))
  const last = run.game.guesses.at(-1)
  const fresh = last?.type === 'key' && last.hit ? last.key : null
  const over = run.game.status !== 'playing'
  const qa = run.settings.pool === 'qa'

  return (
    <div className="play">
      <header className="topbar">
        <button type="button" className="wordmark" onClick={() => setScreen('start')} aria-label="Back to the start screen">
          Spellify <span>Endless</span>
        </button>
        {qa ? (
          <p className="run-meta">
            <span className="run-mode">{run.settings.hard ? 'QA · Hard' : 'QA'}</span>
            <span>
              Card <strong>{run.index + 1}</strong> of {poolSize('qa', cards!).toLocaleString()}
            </span>
          </p>
        ) : (
          <p className="run-meta">
            <span className="run-mode">{settingsLabel(run.settings)}</span>
            <span className="run-streak">
              Streak <strong>{run.streak}</strong>
            </span>
            <span className="run-best">
              Best <strong>{bests[bestKey(run.settings)] ?? 0}</strong>
            </span>
          </p>
        )}
      </header>

      {qa && (
        <div className="qa-bar">
          <span className="qa-frame">{qaCategory(card)}</span>
          <button type="button" className="tool" onMouseDown={(e) => e.preventDefault()} onClick={() => setRun((r) => (r ? revealCard(r) : r))} disabled={over}>
            Reveal
          </button>
          <button type="button" className="tool" onMouseDown={(e) => e.preventDefault()} onClick={skip}>
            Skip
          </button>
        </div>
      )}

      <main className="stage">
        <CardFace key={`${run.seed}:${run.index}`} card={card} view={view} guessed={guessed} fresh={fresh} hard={run.settings.hard} over={over} />
      </main>

      <footer className="controls">
        <GuessBar game={run.game} onGuessName={() => setNaming(true)} />
        {over ? (
          <EndOfCard
            card={card}
            game={run.game}
            streak={run.streak}
            best={bests[bestKey(run.settings)] ?? 0}
            qa={qa}
            onNext={qa ? skip : next}
            onPlayAgain={() => begin(run.settings)}
            onMenu={() => setScreen('start')}
          />
        ) : (
          <Keyboard results={results} disabled={over} onKey={(key) => guess({ key })} />
        )}
      </footer>

      {naming && !over && (
        <NameGuess
          tokens={view.answer}
          guessed={guessed}
          tries={triesLeft(run.game)}
          onClose={() => setNaming(false)}
          onGuess={(name) => {
            guess({ name })
            setNaming(false)
          }}
        />
      )}
    </div>
  )
}

function Message({ title, body }: { title: string; body?: string }) {
  return (
    <main className="message">
      <h1>{title}</h1>
      {body && <p>{body}</p>}
    </main>
  )
}
