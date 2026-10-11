// Title, pool and mode choice, best streak, and Play / Continue.
import { useEffect, useState } from 'react'
import { MAX_TRIES } from '../game/cardGame'
import { POOLS, bestKey, type Bests, type Run, type Settings } from '../game/run'
import { POOL_INFO, settingsLabel } from './labels'

const TITLE = [...'SPELLIFY']
const REVEAL_ORDER = [3, 1, 7, 5]

function Title() {
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const [shown, setShown] = useState(reduced ? REVEAL_ORDER.length : 0)
  useEffect(() => {
    if (shown >= REVEAL_ORDER.length) return
    const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 500 : 220)
    return () => clearTimeout(t)
  }, [shown])
  const hidden = new Set(REVEAL_ORDER.slice(shown))
  return (
    <h1 className="title" aria-label="Spellify Endless">
      <span className="title-word" aria-hidden>
        {TITLE.map((ch, i) =>
          hidden.has(i) ? <span key={i} className="title-slot" /> : <span key={i} className={REVEAL_ORDER.includes(i) ? 'fresh' : ''}>{ch}</span>,
        )}
      </span>
      <span className="title-sub" aria-hidden>
        Endless
      </span>
    </h1>
  )
}

type Props = {
  settings: Settings
  onSettings: (s: Settings) => void
  bests: Bests
  saved: Run | null
  allCount: number | null
  busy: boolean
  onPlay: () => void
  onResume: () => void
}

export function StartScreen({ settings, onSettings, bests, saved, allCount, busy, onPlay, onResume }: Props) {
  const best = bests[bestKey(settings)] ?? 0
  return (
    <main className="start">
      <Title />
      <p className="tagline">Name the Magic card before your {MAX_TRIES} tries run out. Then do it again.</p>

      <fieldset className="pools">
        <legend>Card pool</legend>
        {POOLS.map((p) => {
          const info = POOL_INFO[String(p)]
          return (
            <label key={p} className={`pool${settings.pool === p ? ' selected' : ''}`}>
              <input type="radio" name="pool" checked={settings.pool === p} onChange={() => onSettings({ ...settings, pool: p })} />
              <span className="pool-label">{info.label}</span>
              <span className="pool-note">
                {p === 'all' && allCount ? `${allCount.toLocaleString()} cards, at random` : info.note}
              </span>
            </label>
          )
        })}
      </fieldset>

      <label className="toggle">
        <input type="checkbox" checked={settings.hard} onChange={(e) => onSettings({ ...settings, hard: e.target.checked })} />
        <span className="toggle-track" aria-hidden />
        <span>
          <span className="toggle-label">Hard mode</span>
          <span className="toggle-note">Hide the frame color too</span>
        </span>
      </label>

      <p className="best">
        Best streak for {settingsLabel(settings)}: <strong>{best}</strong>
      </p>

      {saved ? (
        <div className="start-actions">
          <button type="button" className="btn" onClick={onPlay} disabled={busy}>
            New run
          </button>
          <button type="button" className="btn btn-primary btn-wide" onClick={onResume} disabled={busy} autoFocus>
            Continue run
            <span className="btn-note">
              Streak {saved.streak} · {settingsLabel(saved.settings)}
            </span>
          </button>
        </div>
      ) : (
        <div className="start-actions">
          <button type="button" className="btn btn-primary btn-wide" onClick={onPlay} disabled={busy} autoFocus>
            {busy ? 'Loading every card…' : 'Play'}
          </button>
        </div>
      )}

      <details className="how">
        <summary>How to play</summary>
        <ul>
          <li>Everything printed on the card is hidden. Only the frame color shows, and hard mode hides that too.</li>
          <li>Guess letters, numbers and mana symbols to fill in the blanks across the whole card.</li>
          <li>Every guess costs one of your {MAX_TRIES} tries, including guessing the name.</li>
          <li>
            Handle the card like a real one: Rotate it to read split cards and battles, which are printed sideways, and
            check the other side for double-faced cards, which have blanks on the back too.
          </li>
          <li>Solve the card to keep your streak going. Run out of tries and the run ends.</li>
          <li>On a keyboard, type to guess and press Enter to name the card.</li>
        </ul>
      </details>
      <p className="credits">
        Card data and images from <a href="https://scryfall.com">Scryfall</a>. Popularity from{' '}
        <a href="https://edhrec.com">EDHREC</a>. Inspired by EDHREC's{' '}
        <a href="https://edhrec.com/games/spellify">Spellify</a>. Not affiliated with Wizards of the Coast.
      </p>
    </main>
  )
}
