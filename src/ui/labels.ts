import type { Pool, Settings } from '../game/run'

export const POOL_INFO: Record<string, { label: string; note: string }> = {
  '500': { label: 'Top 500', note: 'Staples in almost every deck' },
  '2000': { label: 'Top 2,000', note: 'Popular Commander cards' },
  '10000': { label: 'Top 10,000', note: 'Deep cuts, still EDHREC-ranked' },
  all: { label: 'Any card', note: 'Every card ever printed, at random' },
}

export const poolLabel = (pool: Pool) => POOL_INFO[String(pool)].label
export const settingsLabel = (s: Settings) => `${poolLabel(s.pool)}${s.hard ? ' · Hard' : ''}`
