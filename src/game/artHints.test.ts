import { describe, expect, it } from 'vitest'
import { ART_HINT_COST, MAX_ART_HINTS, patchRects } from './artHints'

const center = (r: { x: number; y: number; size: number }) => ({ cx: r.x + r.size / 2, cy: r.y + r.size / 2 })

describe('patchRects', () => {
  const w = 400
  const h = 300
  const R = Math.hypot(w, h) / 2 // 250: center to corner

  it('places one square per hint, each in its ring, outermost first', () => {
    const rects = patchRects(4, 'card-1:0', w, h)
    expect(rects).toHaveLength(4)
    rects.forEach((r, i) => {
      const { cx, cy } = center(r)
      const d = Math.hypot(cx - w / 2, cy - h / 2)
      expect(d).toBeLessThanOrEqual(R - (i * R) / 4 + 1e-9)
      expect(d).toBeGreaterThanOrEqual(R - ((i + 1) * R) / 4 - 1e-9)
    })
  })

  it('makes each square half as wide as a ring, and keeps it inside the art', () => {
    for (const r of patchRects(4, 'card-2:1', w, h)) {
      expect(r.size).toBeCloseTo(R / 8)
      expect(r.x).toBeGreaterThanOrEqual(0)
      expect(r.y).toBeGreaterThanOrEqual(0)
      expect(r.x + r.size).toBeLessThanOrEqual(w)
      expect(r.y + r.size).toBeLessThanOrEqual(h)
    }
  })

  it('is the same for the same card and art box, and scales with the box', () => {
    expect(patchRects(3, 'card-3:0', w, h)).toEqual(patchRects(3, 'card-3:0', w, h))
    expect(patchRects(1, 'card-3:0', w, h)).not.toEqual(patchRects(1, 'card-3:1', w, h))
    const big = patchRects(2, 'card-3:0', w * 2, h * 2)
    patchRects(2, 'card-3:0', w, h).forEach((r, i) => expect(big[i].x).toBeCloseTo(r.x * 2))
  })

  it('works for tall and very wide art boxes', () => {
    for (const [bw, bh] of [[100, 260], [600, 160]]) {
      const rects = patchRects(4, 'card-4:0', bw, bh)
      expect(rects).toHaveLength(4)
      for (const r of rects) expect(r.x + r.size).toBeLessThanOrEqual(bw)
    }
  })

  it('allows four hints at three tries each', () => {
    expect(ART_HINT_COST).toBe(3)
    expect(MAX_ART_HINTS).toBe(4)
  })
})
