// Title, pool and mode choice, best streak, and Play / Continue.
import { useEffect, useMemo, useState } from 'react'
import { MAX_TRIES } from '../game/cardGame'
import type { Format, Pool } from '../game/pools'
import { bestKey, type Bests, type Run, type Settings } from '../game/run'
import { fetchSets, type SetInfo } from '../data/scryfall'
import { settingsLabel } from './labels'

const TITLE = [...'MTGuessr']
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
    <h1 className="title" aria-label="MTGuessr Endless">
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

/** "2026-10-13" → "Oct 13, 2026" (dates are calendar days, so no time zone shift). */
const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

type Group = 'commander' | 'standard' | 'pioneer' | 'modern' | 'everything' | 'set' | 'qa'

const GROUPS: { id: Group; label: string }[] = [
  { id: 'commander', label: 'Commander' },
  { id: 'standard', label: 'Standard' },
  { id: 'pioneer', label: 'Pioneer' },
  { id: 'modern', label: 'Modern' },
  { id: 'everything', label: 'All of Magic' },
  { id: 'set', label: 'One set' },
]

function groupOf(pool: Pool): Group {
  if (typeof pool === 'number') return 'commander'
  if (pool === 'all' || pool === 'legends') return 'everything'
  if (pool === 'qa') return 'qa'
  if (pool.startsWith('set:')) return 'set'
  return pool.replace('-staples', '') as Format
}

const STAPLES_NOTE = 'Most-played in recent Magic Online tournaments'

function choices(group: Group): { pool: Pool; label: string; note: string }[] {
  switch (group) {
    case 'commander':
      return [
        { pool: 500, label: 'Top 500', note: 'Staples in almost every deck' },
        { pool: 2000, label: 'Top 2,000', note: 'Popular Commander cards' },
        { pool: 10000, label: 'Top 10,000', note: 'Deep cuts, still EDHREC-ranked' },
      ]
    case 'everything':
      return [
        { pool: 'all', label: 'Any card', note: 'Every card ever printed, at random' },
        { pool: 'legends', label: 'Legendary creatures', note: 'Every legend in Magic’s history' },
      ]
    case 'qa':
      return [{ pool: 'qa', label: 'QA: special frames', note: 'Takes turns through every special card frame' }]
    case 'set':
      return []
    default:
      return [
        { pool: `${group}-staples`, label: 'Staples', note: STAPLES_NOTE },
        { pool: group, label: 'Any legal card', note: `Every ${group[0].toUpperCase()}${group.slice(1)}-legal card` },
      ]
  }
}

type Props = {
  qa: boolean
  settings: Settings
  onSettings: (s: Settings) => void
  count: (pool: Pool) => number | null
  bests: Bests
  saved: Run | null
  busy: boolean
  error: string | null
  updated: { cards: string | null; staples: string | null }
  onPlay: () => void
  onResume: () => void
}

export function StartScreen({ qa, settings, onSettings, count, bests, saved, busy, error, updated, onPlay, onResume }: Props) {
  const [group, setGroup] = useState<Group>(() => groupOf(settings.pool))
  const groups = qa ? [...GROUPS, { id: 'qa' as const, label: 'QA' }] : GROUPS
  const ready = groupOf(settings.pool) === group
  const best = bests[bestKey(settings)] ?? 0

  const pickGroup = (g: Group) => {
    setGroup(g)
    const first = choices(g)[0]
    if (first) onSettings({ ...settings, pool: first.pool, setName: undefined })
  }

  return (
    <main className="start">
      <Title />
      <p className="tagline">Name the Magic card before your {MAX_TRIES} tries run out. Then do it again.</p>
      <p className="origin">
        An endless take on <a href="https://edhrec.com/games/spellify">Spellify</a> by{' '}
        <a href="https://edhrec.com">EDHREC</a>. Play their daily puzzle there.
      </p>

      <fieldset className="groups">
        <legend>Play cards from</legend>
        <div className="group-tabs" role="radiogroup" aria-label="Play cards from">
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              role="radio"
              aria-checked={group === g.id}
              className={`group-tab${group === g.id ? ' selected' : ''}`}
              onClick={() => pickGroup(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>

        {group === 'set' ? (
          <SetPicker
            value={settings.pool.toString().startsWith('set:') ? settings.pool.toString().slice(4) : null}
            onPick={(set) => onSettings({ ...settings, pool: `set:${set.code}`, setName: set.name })}
          />
        ) : (
          <div className="pools">
            {choices(group).map((c) => {
              const n = count(c.pool)
              return (
                <label key={String(c.pool)} className={`pool${settings.pool === c.pool ? ' selected' : ''}`}>
                  <input type="radio" name="pool" checked={settings.pool === c.pool} onChange={() => onSettings({ ...settings, pool: c.pool, setName: undefined })} />
                  <span className="pool-label">{c.label}</span>
                  <span className="pool-note">{n ? `${c.note} · ${n.toLocaleString()} cards` : c.note}</span>
                </label>
              )
            })}
          </div>
        )}
      </fieldset>

      <label className="toggle">
        <input type="checkbox" checked={settings.hard} onChange={(e) => onSettings({ ...settings, hard: e.target.checked })} />
        <span className="toggle-track" aria-hidden />
        <span>
          <span className="toggle-label">Hard mode</span>
          <span className="toggle-note">Hide the frame color too</span>
        </span>
      </label>

      {!ready ? (
        <p className="best">Pick a set to play.</p>
      ) : settings.pool === 'qa' ? (
        <p className="best">QA runs skip the streak: every card moves on to the next, and nothing counts toward best streaks.</p>
      ) : (
        <p className="best">
          Best streak for {settingsLabel(settings)}: <strong>{best}</strong>
        </p>
      )}

      {saved ? (
        <div className="start-actions">
          <button type="button" className="btn" onClick={onPlay} disabled={busy || !ready}>
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
          <button type="button" className="btn btn-primary btn-wide" onClick={onPlay} disabled={busy || !ready} autoFocus>
            {busy ? 'Loading cards…' : 'Play'}
          </button>
        </div>
      )}
      {error && <p className="start-error">{error}</p>}

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
          <li>
            The card’s text is always its current Oracle wording: the official, up-to-date rules text. It can differ from
            the printed card shown at the end, especially on older cards.
          </li>
          <li>On a keyboard, type to guess and press Enter to name the card.</li>
        </ul>
      </details>
      <p className="credits">
        Card data and images from <a href="https://scryfall.com">Scryfall</a>. Commander popularity from{' '}
        <a href="https://edhrec.com">EDHREC</a>; format staples from{' '}
        <a href="https://www.mtgo.com/decklists">Magic Online tournament results</a>. Based on EDHREC's{' '}
        <a href="https://edhrec.com/games/spellify">Spellify</a>; not affiliated with EDHREC or Scryfall.
      </p>
      {(updated.cards || updated.staples) && (
        <p className="credits">
          {updated.cards && `Card data updated ${shortDate(updated.cards)}`}
          {updated.cards && updated.staples && ' · '}
          {updated.staples && `format staples ${shortDate(updated.staples)}`}.
        </p>
      )}
      <p className="credits">
        MTGuessr is unofficial Fan Content permitted under the{' '}
        <a href="https://company.wizards.com/en/legal/fancontentpolicy">Fan Content Policy</a>. Not approved/endorsed
        by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
      </p>
    </main>
  )
}

/** Searchable list of sets, newest first, loaded from Scryfall. */
function SetPicker({ value, onPick }: { value: string | null; onPick: (set: SetInfo) => void }) {
  const [sets, setSets] = useState<SetInfo[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetchSets().then(setSets, () => setFailed(true))
  }, [])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (sets ?? []).filter((s) => !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase() === q).slice(0, 60)
  }, [sets, query])

  if (failed) return <p className="set-status">Couldn’t reach Scryfall for the list of sets. Check your connection and try again.</p>
  if (!sets) return <p className="set-status">Loading sets…</p>
  return (
    <div className="set-picker">
      <input className="set-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search sets, e.g. Duskmourn or DSK" aria-label="Search sets" />
      <ul className="set-list">
        {shown.map((s) => (
          <li key={s.code}>
            <button type="button" className={`set-option${value === s.code ? ' selected' : ''}`} onClick={() => onPick(s)}>
              <span className="set-name">{s.name}</span>
              <span className="set-meta">
                {s.code} · {s.released.slice(0, 4)}
              </span>
            </button>
          </li>
        ))}
        {shown.length === 0 && <li className="set-status">No sets match “{query}”.</li>}
      </ul>
    </div>
  )
}
