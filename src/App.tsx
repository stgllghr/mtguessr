import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchSetPrintings } from './data/scryfall'
import type { Card } from './game/card'
import { artHints, buildView, guessedKeys, triesLeft } from './game/cardGame'
import { fromPrinting, isPool, nameIndex, poolCards, poolNeeds, type Catalog, type Staples } from './game/pools'
import { qaCategory } from './game/qa'
import {
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
  type GuessInput,
  type Pool,
  type Run,
  type Settings,
} from './game/run'
import { load, migrate, save } from './game/storage'
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
const allowed = (pool: Pool) => QA || pool !== 'qa'

const KEYS = { settings: 'mtguessr:settings', bests: 'mtguessr:bests', run: 'mtguessr:run' }
// Saves from before the game was renamed move over once.
for (const key of Object.values(KEYS)) migrate(key.replace('mtguessr:', 'spellify-endless:'), key)

async function fetchJson<T>(file: string): Promise<T> {
  const res = await fetch(`/${file}`)
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`)
  return res.json()
}

function loadSettings(): Settings {
  const s = load<Partial<Settings> | null>(KEYS.settings, null)
  return s && isPool(s.pool) && allowed(s.pool) && typeof s.hard === 'boolean' ? (s as Settings) : { pool: 500, hard: false }
}

function loadRun(): Run | null {
  const r = load<unknown>(KEYS.run, null)
  return isRun(r) && allowed(r.settings.pool) ? r : null
}

export default function App() {
  const [top, setTop] = useState<Card[] | null>(null)
  const [rest, setRest] = useState<Card[] | null>(null)
  const [staples, setStaples] = useState<Staples | null>(null)
  const [cardsUpdated, setCardsUpdated] = useState<string | null>(null)
  const [sets, setSets] = useState<Record<string, Card[]>>({})
  const [fatal, setFatal] = useState<string | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [settings, setSettings] = useState(loadSettings)
  const [bests, setBests] = useState<Bests>(() => load(KEYS.bests, {}))
  const [run, setRun] = useState<Run | null>(loadRun)
  const [screen, setScreen] = useState<'start' | 'play'>(() => ((loadRun()?.game.status ?? 'lost') !== 'lost' ? 'play' : 'start'))
  const [naming, setNaming] = useState(false)
  const requests = useRef<Record<string, Promise<unknown>>>({})

  /** Starts a download once; later callers share it. A failed one can be retried. */
  const once = useCallback(<T,>(key: string, make: () => Promise<T>): Promise<T> => {
    requests.current[key] ??= make().catch((err) => {
      delete requests.current[key]
      throw err
    })
    return requests.current[key] as Promise<T>
  }, [])

  useEffect(() => {
    fetchJson<Card[]>('cards-top.json')
      .then(setTop)
      .catch(() => setFatal('The card list did not load. Check your connection, then reload the page.'))
    once('staples', () => fetchJson<Staples>('staples.json')).then(setStaples, () => {})
    fetchJson<{ cards: string }>('meta.json').then((m) => setCardsUpdated(m.cards), () => {})
  }, [once])

  const all = useMemo(() => (top && rest ? top.concat(rest) : null), [top, rest])
  const catalog = useMemo<Catalog | null>(() => (top ? { top, all, staples, sets } : null), [top, all, staples, sets])

  /** Loads whatever a pool needs. Rejects with a message for the player. */
  const ensure = useCallback(
    async (pool: Pool) => {
      if (!top) return
      const needs = poolNeeds(pool)
      let allCards = all
      if (needs.all && !allCards) {
        const r = await once('rest', () => fetchJson<Card[]>('cards-rest.json')).catch(() => {
          throw new Error('The full card list did not load. Check your connection and try again.')
        })
        setRest(r)
        allCards = top.concat(r)
      }
      if (needs.staples && !staples) {
        setStaples(
          await once('staples', () => fetchJson<Staples>('staples.json')).catch(() => {
            throw new Error('The tournament staples list did not load. Check your connection and try again.')
          }),
        )
      }
      if (needs.set && !sets[needs.set] && allCards) {
        const code = needs.set
        const printings = await once(`set:${code}`, () => fetchSetPrintings(code)).catch(() => {
          throw new Error('Couldn’t load that set from Scryfall. Check your connection and try again.')
        })
        const index = nameIndex(allCards)
        const cards = printings.flatMap((p) => fromPrinting(p, index) ?? [])
        setSets((s) => ({ ...s, [code]: cards }))
        if (cards.length === 0) throw new Error('That set has no cards this game can show.')
      }
    },
    [top, all, staples, sets, once],
  )

  const cards = useMemo(() => (run && catalog ? poolCards(run.settings.pool, catalog) : null), [run?.settings.pool, catalog])
  const card = run && cards ? currentCard(run, cards) : null
  const view = useMemo(() => (card ? buildView(card) : null), [card])

  // A saved run may need more card data (the full list, staples, or its set) before it can show its card.
  useEffect(() => {
    if (screen !== 'play' || !run || cards) return
    ensure(run.settings.pool).catch((err: Error) => {
      setStartError(err.message)
      setScreen('start')
    })
  }, [screen, run, cards, ensure])

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
    setStartError(null)
    setBusy(true)
    try {
      await ensure(s.pool)
    } catch (err) {
      setStartError((err as Error).message)
      setScreen('start')
      return
    } finally {
      setBusy(false)
    }
    setRun(startRun(s, newSeed()))
    setNaming(false)
    setScreen('play')
  }

  const guess = useCallback(
    (g: GuessInput) => setRun((r) => (r && cards ? applyGuess(r, cards, g) : r)),
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

  if (fatal) return <Message title="Something went wrong" body={fatal} />
  if (!top || !catalog) return <Message title="Shuffling the deck…" />

  if (screen === 'start' || !run) {
    return (
      <StartScreen
        qa={QA}
        settings={settings}
        onSettings={setSettings}
        count={(pool) => poolCards(pool, catalog)?.length ?? null}
        bests={bests}
        saved={run && run.game.status !== 'lost' ? run : null}
        busy={busy}
        error={startError}
        updated={{ cards: cardsUpdated, staples: staples?.updated ?? null }}
        onPlay={() => begin(settings)}
        onResume={() => setScreen('play')}
      />
    )
  }

  if (!card || !view || !cards) return <Message title="Loading cards…" />

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
          MTGuessr
        </button>
        {qa ? (
          <p className="run-meta">
            <span className="run-mode">{run.settings.hard ? 'QA · Hard' : 'QA'}</span>
            <span>
              Card <strong>{run.index + 1}</strong> of {poolSize('qa', cards).toLocaleString()}
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
        <CardFace key={`${run.seed}:${run.index}`} card={card} view={view} guessed={guessed} fresh={fresh} hard={run.settings.hard} over={over} artHints={artHints(run.game)} />
      </main>

      <footer className="controls">
        <GuessBar game={run.game} onGuessName={() => setNaming(true)} onArtHint={() => guess({ art: true })} />
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
