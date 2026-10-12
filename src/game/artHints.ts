// Art hints: each one reveals a small square of the card's art, starting at the edge and
// working in. An art box is split into four rings of equal width around its center (out to
// the corners); hint n reveals a square in ring n, outermost first. Squares are half a ring
// wide and land in the same place every time for the same card.
import { randomFrom } from './random'

export const ART_HINT_COST = 3
export const MAX_ART_HINTS = 4 // 4 × 3 tries leaves one of the 13 for naming the card

export type Patch = { x: number; y: number; size: number }

/** The revealed squares for `hints` hints in a w × h art box, seeded by card and art box. */
export function patchRects(hints: number, seed: string, w: number, h: number): Patch[] {
  const R = Math.hypot(w, h) / 2
  const ring = R / MAX_ART_HINTS
  const size = ring / 2
  const out: Patch[] = []
  for (let i = 0; i < Math.min(hints, MAX_ART_HINTS); i++) {
    const rand = randomFrom(`${seed}:${i}`)
    const outer = R - i * ring
    const inner = outer - ring
    let cx = w / 2
    let cy = h / 2
    for (let tries = 0; tries < 500; tries++) {
      // Uniform over the ring's area, then keep it only if the whole square fits in the box.
      const angle = rand() * 2 * Math.PI
      const r = Math.sqrt(inner * inner + rand() * (outer * outer - inner * inner))
      const x = w / 2 + r * Math.cos(angle)
      const y = h / 2 + r * Math.sin(angle)
      if (x - size / 2 >= 0 && x + size / 2 <= w && y - size / 2 >= 0 && y + size / 2 <= h) {
        cx = x
        cy = y
        break
      }
    }
    out.push({ x: cx - size / 2, y: cy - size / 2, size })
  }
  return out
}
