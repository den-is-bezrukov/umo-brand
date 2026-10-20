/**
 * The guide's logo with the Yandex cobrand (true) or UMO alone (false). Off, the logo is the wordmark and shrinks with
 * the scroll as before, and the first screen's extra room for the Y (UMO_Y_PAD in Guide) goes.
 */
export const COBRAND = true

/**
 * UMO with the Y cobrand, in Figma's units: the wordmark 300×60, the lockup 500×100, a unit `--u`
 * (0.4px by default, so UMO is 24 high). Built of separate HTML layers — the wordmark, the cobrand's clip, the divider
 * and the Y — so the fold moves layers, which Safari runs on the scroll's own thread in step with a finger, where moving
 * parts inside one SVG redrew it on the main thread and lagged (index.css; `setUmoY` without scroll timelines). Folding,
 * the cobrand slides 70 left into the O's right wall, the Y turns a quarter and shrinks to 0.46 behind the cobrand's
 * clip, and the divider steps 2 left between 0.3 and 0.7 of the way; the moves are in percent of each layer, so they
 * hold at any unit. The box is the wordmark's height and the lockup's width; the Y's circle overhangs it 20 above and
 * below.
 */
export default function UmoYLayers({ title }: { title?: string }) {
  return (
    <div role={title ? 'img' : undefined} aria-label={title} className={`relative h-[calc(var(--u,0.4px)*60)] ${COBRAND ? 'w-[calc(var(--u,0.4px)*500)]' : 'w-[calc(var(--u,0.4px)*300)]'}`} data-umo-y-layers>
      <svg viewBox="0 0 300 60" fill="currentColor" aria-hidden className="absolute top-0 left-0 h-full w-[calc(var(--u,0.4px)*300)]">
        <path d="M136.5 21.75H113.999V60H91.5V21.6716C91.5 6.27761 98.8099 0 113.999 0H136.5V21.75ZM181.499 0C196.683 0 204 6.26866 204 21.6716V60H181.499V21.75H159V60H136.5V21.75H159V0H181.499Z" />
        <path d="M61.5 38.25H22.5V0H0V38.3284C0 53.7313 7.32523 60 22.5188 60H61.479C76.6837 60 84 53.7224 84 38.3284V0H61.5V38.25Z" />
        <path fillRule="evenodd" clipRule="evenodd" d="M277.483 0C292.678 0 300 6.26866 300 21.6716V38.3284C300 53.7224 292.687 60 277.483 60H234.019C218.822 60 211.5 53.7313 211.5 38.3284V21.6716C211.5 6.27761 218.822 0 234.019 0H277.483ZM234 38.25H277.5V21.6716L234 21.75V38.25Z" />
      </svg>
      {COBRAND && <div data-layer="cobrand" className="absolute top-[calc(var(--u,0.4px)*-20)] left-0 h-[calc(var(--u,0.4px)*100)] w-[calc(var(--u,0.4px)*151)] overflow-hidden will-change-transform [transform:translateX(231.126%)]">
        <div data-layer="divider" className="absolute top-[calc(var(--u,0.4px)*20)] left-[calc(var(--u,0.4px)*-1)] h-[calc(var(--u,0.4px)*60)] w-[calc(var(--u,0.4px)*2)] bg-current will-change-transform [transform:translateX(50%)]" />
        <svg data-layer="y" viewBox="0 0 100 100" fill="currentColor" aria-hidden className="absolute top-0 left-0 size-[calc(var(--u,0.4px)*100)] will-change-transform [transform:translateX(51%)]">
          <path fillRule="evenodd" clipRule="evenodd" d="M50 0C77.6142 0 100 22.3858 100 50C100 77.6142 77.6142 100 50 100C22.3858 100 0 77.6142 0 50C0 22.3858 22.3858 0 50 0ZM52.2988 20.0498C37.0212 20.0498 28.9904 27.9038 28.9902 39.4717C28.9902 48.7098 33.3927 54.148 41.251 59.7578L27.6103 80.0488H38.9209L54.1123 57.3418L48.8467 53.8047C42.4588 49.4888 39.3507 46.118 39.3506 38.8662C39.3506 32.4782 43.8388 28.1621 52.3848 28.1621H57.0439L57.0488 80.0488H67.4951V20.0498H52.2988Z" />
        </svg>
      </div>}
    </div>
  )
}

/** The fold by `t` from 0 to 1 by script, for browsers without scroll timelines (the same moves as index.css). */
export function setUmoY(el: HTMLElement, t: number) {
  const k = Math.min(1, Math.max(0, t))
  const d = Math.min(1, Math.max(0, (t - 0.3) / 0.4))
  const set = (name: string, transform: string) => {
    const n = el.querySelector<HTMLElement | SVGElement>(`[data-layer="${name}"]`)
    if (n) n.style.transform = transform
  }
  set('cobrand', `translateX(${231.126 - 46.358 * k}%)`)
  set('divider', `translateX(${50 - 100 * d}%)`)
  set('y', `translateX(${51 - 111 * k}%) rotate(${-90 * k}deg) scale(${1 - 0.54 * k})`)
}
