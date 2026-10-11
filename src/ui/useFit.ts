// Shrinks text (by returning a smaller scale) until its element stops overflowing, like printed cards do.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export function useFit<T extends HTMLElement>(version: number, axis: 'x' | 'y', min = 0.6) {
  const ref = useRef<T>(null)
  const [scale, setScale] = useState(1)
  const [fontsReady, setFontsReady] = useState(false)

  useEffect(() => {
    let live = true
    document.fonts?.ready.then(() => live && setFontsReady(true))
    return () => {
      live = false
    }
  }, [])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || scale <= min) return
    const overflowing = axis === 'x' ? el.scrollWidth > el.clientWidth + 1 : el.scrollHeight > el.clientHeight + 1
    if (overflowing) {
      setScale((s) => Math.round((s - 0.04) * 100) / 100)
    }
  }, [scale, version, fontsReady, axis, min])

  return [ref, scale] as const
}
