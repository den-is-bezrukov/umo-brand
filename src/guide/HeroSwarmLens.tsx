import { useEffect, useRef, type RefObject } from 'react'
import { DEFAULTS, swarmLens } from './hero/swarmLens'
import settings from './hero.json'

/**
 * The hero's picture: Рой в линзе (./hero/swarmLens.ts) with the settings in ./hero.json, which the lab's «В гайд»
 * (lab/swarm-lens.html) writes. Drawn only while some of the box is on screen: from lg the page slides over it, on
 * a phone it scrolls away; with reduced motion it stands still; without WebGL2 the box stays black.
 */
const PARAMS = { ...DEFAULTS, ...settings }

export default function HeroSwarmLens({ boxRef, bodyRef }: { boxRef: RefObject<HTMLElement | null>; bodyRef: RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const visible = () => {
      const box = boxRef.current?.getBoundingClientRect()
      const below = bodyRef.current?.getBoundingClientRect().top ?? Infinity
      return !!box && Math.min(box.bottom, below) - Math.max(box.top, 0) > 0
    }
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return swarmLens(canvas, () => PARAMS, { visible, still })
  }, [boxRef, bodyRef])
  return <canvas ref={canvasRef} aria-hidden className="block size-full bg-black" />
}
