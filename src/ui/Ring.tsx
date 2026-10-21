import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

/** Copies of the items in the line: the middle one in view, a whole turn either side to scroll through */
const TURNS = 3

type Item = { key: string; title: string }

/**
 * A line of names to pick one from: the generators' line in their form's header. Scrolled
 * natively, as a phone's tabs, by a finger, a trackpad or the wheel (not turned by script, which runs on and comes back
 * round on its own, unlike anything else under a finger), and picked as a drum: the name the line comes to rest on,
 * 24 px from the edge, is picked the instant the finger is off and the line is
 * still; a tap picks one too. It goes round: the items in their order three times over, the current
 * one of the middle copy at the edge, so there's a whole turn to scroll either way; after a pick the line comes back to
 * the middle copy, looking the same, and a turn's worth of scrolling to the same name puts it back there unseen.
 * 24 px Medium, 20 px apart (16 in Figma), the one nearest the edge black as it goes, the rest #bfbfbf;
 * the edges shaded white, so the names run off into it. It stands 24 px out to either side, over its parent's padding
 *
 * `href` makes the names links (the generators, pages of their own); `heading` makes the current one an h1; `focus`
 * puts the focus on the line as it mounts (a generator opened from the keys)
 */
export default function Ring({ label, items, current, onPick, href, heading, focus }: {
  label: string
  items: Item[]
  current: string
  /** `keys`: picked with Enter or Space */
  onPick: (key: string, keys?: boolean) => void
  href?: (key: string) => string
  heading?: boolean
  focus?: boolean
}) {
  const count = items.length
  const middle = Math.floor(TURNS / 2) * count + items.findIndex(g => g.key === current)
  const nav = useRef<HTMLElement>(null)
  const [lit, setLit] = useState(current)
  const item = (i: number) => nav.current?.children[i] as HTMLElement | undefined
  // The current one of the middle copy at the edge, before the first paint and again once the font is in
  useLayoutEffect(() => {
    setLit(current)
    const home = () => { const n = nav.current, el = item(middle); if (n && el) n.scrollLeft = el.offsetLeft - 24 }
    home()
    if (focus) nav.current?.focus({ preventScroll: true })
    document.fonts?.ready.then(home)
  }, [current]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const n = nav.current
    if (!n) return
    const nearest = () => {
      let best = middle
      let gap = Infinity
      for (let i = 0; i < count * TURNS; i++) {
        const d = Math.abs(item(i)!.offsetLeft - n.scrollLeft - 24)
        if (d < gap) { gap = d; best = i }
      }
      return best
    }
    // The moment the line is still: `scrollend` where the browser has it, the instant the run and the snap are over;
    // elsewhere 150 ms with no scrolling (0 would pick a name the line only passes by)
    const ends = 'onscrollend' in window
    let touching = false
    let timer = 0
    // Only a scroll someone made picks: the snap redoing itself as the panel resizes ended a scroll too, and opened the
    // next generator on its own
    let moved = false
    // The name the arrows last turned it to, while they drive it
    let target = -1
    // The wheel scrolls the line across (a mouse has no other way to), and a pick waits until it's been still a moment,
    // as each notch of the wheel ends a scroll of its own
    let wheeled = 0
    const wheel = (e: WheelEvent) => {
      moved = true
      target = -1
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) { wheeled = performance.now(); return }
      e.preventDefault()
      wheeled = performance.now()
      n.scrollBy({ left: e.deltaY * (e.deltaMode === 1 ? 16 : 1), behavior: 'smooth' })
    }
    const pick = () => {
      if (touching || !moved) return
      const quiet = performance.now() - wheeled
      if (quiet < 300) { clearTimeout(timer); timer = window.setTimeout(pick, 300 - quiet); return }
      const i = nearest()
      const key = items[i % count].key
      moved = false
      if (key !== current) onPick(key)
      // The same name a turn away: back to the middle copy, unseen
      else if (i !== middle) n.scrollLeft += item(middle)!.offsetLeft - item(i)!.offsetLeft
    }
    const settle = () => { clearTimeout(timer); if (!ends) timer = window.setTimeout(pick, 150) }
    // The keys turn it without picking anything (one stray arrow left a page and its unsaved list): ← → by one name
    // each, counted from the one the last press went to, so quick presses add up (the browser's own arrow scroll takes
    // one press while the line is still moving), Enter or Space picks that name, Esc turns it home, as does the focus
    // leaving it. A finger's or the wheel's scroll still picks where it rests
    const turnTo = (i: number) => { target = i; n.scrollTo({ left: item(i)!.offsetLeft - 24, behavior: 'smooth' }) }
    const home = () => turnTo(middle)
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
        const from = target >= 0 ? target : nearest()
        turnTo(Math.max(0, Math.min(count * TURNS - 1, from + (e.key === 'ArrowRight' ? 1 : -1))))
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const k = items[(target >= 0 ? target : nearest()) % count].key
        target = -1
        if (k !== current) onPick(k, true)
      } else if (e.key === 'Escape') {
        // Turned away by the arrows, Esc only turns it home (a dialog round it stays open)
        if (target >= 0) e.stopPropagation()
        home()
      }
    }
    const leave = (e: FocusEvent) => { if (!n.contains(e.relatedTarget as Node)) home() }
    // Resized, the current one back at the edge
    const observer = new ResizeObserver(() => { if (!moved) n.scrollLeft = item(middle)!.offsetLeft - 24 })
    observer.observe(n)
    const scroll = () => { setLit(items[nearest() % count].key); settle() }
    const down = () => { touching = true; moved = true; target = -1; clearTimeout(timer) }
    const up = () => { touching = false; settle() }
    if (ends) n.addEventListener('scrollend', pick)
    n.addEventListener('wheel', wheel, { passive: false })
    n.addEventListener('keydown', key)
    n.addEventListener('focusout', leave)
    n.addEventListener('scroll', scroll, { passive: true })
    n.addEventListener('touchstart', down, { passive: true })
    n.addEventListener('touchend', up)
    n.addEventListener('touchcancel', up)
    return () => {
      clearTimeout(timer)
      n.removeEventListener('scrollend', pick)
      n.removeEventListener('wheel', wheel)
      n.removeEventListener('keydown', key)
      n.removeEventListener('focusout', leave)
      observer.disconnect()
      n.removeEventListener('scroll', scroll)
      n.removeEventListener('touchstart', down)
      n.removeEventListener('touchend', up)
      n.removeEventListener('touchcancel', up)
    }
  }, [current]) // eslint-disable-line react-hooks/exhaustive-deps
  const name = 'shrink-0 snap-start text-[24px] font-medium leading-6 tracking-[-0.01em] whitespace-nowrap'
  const tone = (key: string) => (key === lit ? 'text-black' : 'text-[#bfbfbf] hover:text-[#808080] active:text-[#808080]')
  return (
    <div className="relative -mx-6 my-1">
      {/* 8 px over and under for the descenders (р, у), which the scroller would clip; one Tab stop, ringed whole, its
          names turned with ← → and picked with Enter (not one stop each) */}
      <nav ref={nav} aria-label={label} tabIndex={0} className={`relative -my-2 flex snap-x snap-mandatory scroll-pl-6 gap-5 overflow-x-auto overscroll-x-contain py-2 pl-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
        {Array.from({ length: TURNS * count }, (_, i) => {
          const g = items[i % count]
          const copy = i < count || i >= 2 * count || undefined
          if (i === middle && heading) return <h1 key={i} className={`${name} ${tone(g.key)}`}>{g.title}</h1>
          if (href && i !== middle) return <Link key={i} to={href(g.key)} draggable={false} aria-hidden={copy} tabIndex={-1} className={`${name} ${tone(g.key)} outline-none`}>{g.title}</Link>
          return (
            <button key={i} type="button" aria-hidden={copy} aria-current={i === middle || undefined} tabIndex={-1} onClick={() => { if (g.key !== current) onPick(g.key) }} className={`${name} ${tone(g.key)} cursor-pointer outline-none`}>
              {g.title}
            </button>
          )
        })}
      </nav>
      {/* The shades over the edges, as the ring's */}
      <div aria-hidden className="pointer-events-none absolute -inset-y-2 left-0 w-6" style={{ background: 'linear-gradient(90deg, #ffffff80 25%, #fff0), linear-gradient(90deg, #fff 25%, #fff0)' }} />
      <div aria-hidden className="pointer-events-none absolute -inset-y-2 right-0 w-12" style={{ background: 'linear-gradient(90deg, #fff0, #ffffff80), linear-gradient(90deg, #fff0, #fff)' }} />
    </div>
  )
}
