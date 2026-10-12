// Runs before each Vercel build: rebuilds the card data from Scryfall's latest bulk files
// (an official download, not scraping). If anything goes wrong, or the new data fails the
// sanity checks, the build carries on with the card data committed in the repo.
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkCards } from './check-data.mjs'

const FILES = ['cards-top.json', 'cards-rest.json', 'meta.json']
const read = (path) => JSON.parse(readFileSync(path, 'utf8'))

try {
  const dir = mkdtempSync(join(tmpdir(), 'mtguessr-cards-'))
  execFileSync('node', ['scripts/build-cards.mjs', '--out', dir], { stdio: 'inherit', timeout: 20 * 60 * 1000 })
  const committedTotal = read('public/cards-top.json').length + read('public/cards-rest.json').length
  const problems = checkCards(read(join(dir, 'cards-top.json')), read(join(dir, 'cards-rest.json')), committedTotal)
  if (problems.length) throw new Error(`new card data failed its checks:\n  ${problems.join('\n  ')}`)
  for (const file of FILES) copyFileSync(join(dir, file), join('public', file))
  console.log('Card data refreshed from Scryfall.')
} catch (err) {
  console.warn(`Card refresh skipped; deploying the committed card data instead. ${err.message}`)
}
