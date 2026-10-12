// Run on your own computer (not on GitHub or Vercel, whose terms forbid scraping):
// refreshes the format staples from Magic Online results, checks them, then commits and
// pushes, which redeploys the site. Usage: npm run staples:update
import { execFileSync, execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { checkStaples } from './check-data.mjs'

const run = (cmd) => execSync(cmd, { stdio: 'inherit' })
const committed = () => {
  try {
    return JSON.parse(execSync('git show HEAD:public/staples.json', { stdio: ['ignore', 'pipe', 'ignore'] }).toString())
  } catch {
    return null
  }
}

execFileSync('node', ['scripts/build-staples.mjs'], { stdio: 'inherit' })
const staples = JSON.parse(readFileSync('public/staples.json', 'utf8'))
const problems = checkStaples(staples, committed())
if (problems.length) {
  run('git checkout -- public/staples.json')
  console.error(`New staples failed their checks, so the previous list was kept:\n  ${problems.join('\n  ')}`)
  process.exit(1)
}
if (execSync('git status --porcelain public/staples.json').toString().trim() === '') {
  console.log('Staples unchanged; nothing to publish.')
  process.exit(0)
}
run('git add public/staples.json')
run(`git commit -m "Update format staples (${staples.updated})"`)
run('git push')
console.log('Staples updated and pushed; Vercel will redeploy.')
