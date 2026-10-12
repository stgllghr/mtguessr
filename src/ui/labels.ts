import type { Pool } from '../game/pools'
import type { Settings } from '../game/run'

const LABELS: Record<string, string> = {
  '500': 'Top 500',
  '2000': 'Top 2,000',
  '10000': 'Top 10,000',
  all: 'Any card',
  legends: 'Legendary creatures',
  qa: 'QA: special frames',
  standard: 'Standard',
  'standard-staples': 'Standard staples',
  pioneer: 'Pioneer',
  'pioneer-staples': 'Pioneer staples',
  modern: 'Modern',
  'modern-staples': 'Modern staples',
}

export function poolLabel(pool: Pool, setName?: string): string {
  if (typeof pool === 'string' && pool.startsWith('set:')) return setName ?? pool.slice(4)
  return LABELS[String(pool)]
}

export const settingsLabel = (s: Settings) => `${poolLabel(s.pool, s.setName)}${s.hard ? ' · Hard' : ''}`
