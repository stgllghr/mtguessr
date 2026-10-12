// Sanity checks for refreshed data, so a bad download or a changed source page never replaces
// good data. Usage: node scripts/check-data.mjs cards|staples   (exits 1 if something looks wrong)
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const FORMATS = ['standard', 'pioneer', 'modern']

/** Problems with a cards snapshot; `previousTotal` is the last committed card count, if any. */
export function checkCards(top, rest, previousTotal) {
  const problems = []
  const total = top.length + rest.length
  if (top.length !== 10000) problems.push(`cards-top.json has ${top.length} cards, expected 10000`)
  if (total < 30000) problems.push(`only ${total} cards in total, expected at least 30000`)
  if (previousTotal && total < previousTotal * 0.95) problems.push(`card count dropped from ${previousTotal} to ${total}`)
  const broken = [...top, ...rest].filter((c) => !c.n || !c.id || typeof c.t !== 'string')
  if (broken.length) problems.push(`${broken.length} cards are missing a name, id or type line`)
  return problems
}

/** Problems with a staples list; `previous` is the last committed staples.json, if any. */
export function checkStaples(staples, previous) {
  const problems = []
  for (const f of FORMATS) {
    const now = staples.formats?.[f]
    if (!now) {
      problems.push(`${f}: missing`)
      continue
    }
    if (now.decks < 150) problems.push(`${f}: only ${now.decks} decks`)
    if (now.cards.length < 100) problems.push(`${f}: only ${now.cards.length} staples`)
    const before = previous?.formats?.[f]?.cards.length
    if (before && now.cards.length < before * 0.5) problems.push(`${f}: ${now.cards.length} staples, down from ${before}`)
  }
  return problems
}

const read = (path) => JSON.parse(readFileSync(path, 'utf8'))
function committed(path) {
  try {
    return JSON.parse(execSync(`git show HEAD:${path}`, { maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'ignore'] }).toString())
  } catch {
    return null
  }
}

function main(what) {
  let problems
  if (what === 'cards') {
    const before = [committed('public/cards-top.json'), committed('public/cards-rest.json')]
    const previousTotal = before.every(Boolean) ? before[0].length + before[1].length : null
    problems = checkCards(read('public/cards-top.json'), read('public/cards-rest.json'), previousTotal)
  } else if (what === 'staples') {
    problems = checkStaples(read('public/staples.json'), committed('public/staples.json'))
  } else {
    throw new Error('Usage: node scripts/check-data.mjs cards|staples')
  }
  if (problems.length) {
    console.error(`${what} check failed:\n  ${problems.join('\n  ')}`)
    process.exit(1)
  }
  console.log(`${what} look good`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv[2])
