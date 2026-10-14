import { useId } from 'react'

/**
 * UMO with the Y cobrand (Figma 5156:543), in Figma's units: the wordmark 300×60, the lockup 500×100. `setUmoY`
 * folds it by `t` from 0 (UMO | Y) to 1 (UMO alone): the cobrand slides 70 left into the O's right wall, the Y turns
 * a quarter and shrinks to 0.46 behind the cobrand's clip, the divider steps 2 left between 0.3 and 0.7, and the
 * viewBox closes from the lockup onto the wordmark. The box is the wordmark's height, so its top stands where the plain
 * logo's does; the Y's circle overhangs it 20 above and below.
 */
export default function UmoYLogo({ className = '', title }: { className?: string; title?: string }) {
  const clip = useId()
  return (
    <svg
      viewBox="0 20 500 60"
      overflow="visible"
      fill="currentColor"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={`block ${className}`}
      data-umo-y
    >
      <defs>
        <clipPath id={clip}><rect width="151" height="100" /></clipPath>
      </defs>
      <g transform="translate(0 20)">
        <path d="M136.5 21.75H113.999V60H91.5V21.6716C91.5 6.27761 98.8099 0 113.999 0H136.5V21.75ZM181.499 0C196.683 0 204 6.26866 204 21.6716V60H181.499V21.75H159V60H136.5V21.75H159V0H181.499Z" />
        <path d="M61.5 38.25H22.5V0H0V38.3284C0 53.7313 7.32523 60 22.5188 60H61.479C76.6837 60 84 53.7224 84 38.3284V0H61.5V38.25Z" />
        <path fillRule="evenodd" clipRule="evenodd" d="M277.483 0C292.678 0 300 6.26866 300 21.6716V38.3284C300 53.7224 292.687 60 277.483 60H234.019C218.822 60 211.5 53.7313 211.5 38.3284V21.6716C211.5 6.27761 218.822 0 234.019 0H277.483ZM234 38.25H277.5V21.6716L234 21.75V38.25Z" />
      </g>
      <g data-part="cobrand" transform="translate(349 0)" clipPath={`url(#${clip})`}>
        <path data-part="divider" transform="translate(1 20)" d="M0 0V60" stroke="currentColor" strokeWidth="2" />
        <path data-part="y" transform="translate(51 0)" fillRule="evenodd" clipRule="evenodd" d="M50 0C77.6142 0 100 22.3858 100 50C100 77.6142 77.6142 100 50 100C22.3858 100 0 77.6142 0 50C0 22.3858 22.3858 0 50 0ZM52.2988 20.0498C37.0212 20.0498 28.9904 27.9038 28.9902 39.4717C28.9902 48.7098 33.3927 54.148 41.251 59.7578L27.6103 80.0488H38.9209L54.1123 57.3418L48.8467 53.8047C42.4588 49.4888 39.3507 46.118 39.3506 38.8662C39.3506 32.4782 43.8388 28.1621 52.3848 28.1621H57.0439L57.0488 80.0488H67.4951V20.0498H52.2988Z" />
      </g>
    </svg>
  )
}

/** Returns the lockup's width in wordmark widths, 5/3 unfolded to 1 folded, to size the box so the wordmark holds still. */
export function setUmoY(svg: SVGSVGElement, t: number) {
  // Linear, unlike Figma's eased 2-second loop: the scroll sets the pace.
  const k = Math.min(1, Math.max(0, t))
  const d = Math.min(1, Math.max(0, (t - 0.3) / 0.4))
  svg.setAttribute('viewBox', `0 20 ${500 - 200 * k} 60`)
  svg.querySelector('[data-part="cobrand"]')?.setAttribute('transform', `translate(${349 - 70 * k} 0)`)
  svg.querySelector('[data-part="divider"]')?.setAttribute('transform', `translate(${1 - 2 * d} 20)`)
  const s = 1 - 0.54 * k
  svg.querySelector('[data-part="y"]')?.setAttribute('transform', `translate(${51 - 111 * k} 0) translate(50 50) rotate(${-90 * k}) scale(${s}) translate(-50 -50)`)
  return (500 - 200 * k) / 300
}

const UMO_PATHS = [
  'M136.5 21.75H113.999V60H91.5V21.6716C91.5 6.27761 98.8099 0 113.999 0H136.5V21.75ZM181.499 0C196.683 0 204 6.26866 204 21.6716V60H181.499V21.75H159V60H136.5V21.75H159V0H181.499Z',
  'M61.5 38.25H22.5V0H0V38.3284C0 53.7313 7.32523 60 22.5188 60H61.479C76.6837 60 84 53.7224 84 38.3284V0H61.5V38.25Z',
]
const UMO_O = 'M277.483 0C292.678 0 300 6.26866 300 21.6716V38.3284C300 53.7224 292.687 60 277.483 60H234.019C218.822 60 211.5 53.7313 211.5 38.3284V21.6716C211.5 6.27761 218.822 0 234.019 0H277.483ZM234 38.25H277.5V21.6716L234 21.75V38.25Z'
const Y_PATH = 'M50 0C77.6142 0 100 22.3858 100 50C100 77.6142 77.6142 100 50 100C22.3858 100 0 77.6142 0 50C0 22.3858 22.3858 0 50 0ZM52.2988 20.0498C37.0212 20.0498 28.9904 27.9038 28.9902 39.4717C28.9902 48.7098 33.3927 54.148 41.251 59.7578L27.6103 80.0488H38.9209L54.1123 57.3418L48.8467 53.8047C42.4588 49.4888 39.3507 46.118 39.3506 38.8662C39.3506 32.4782 43.8388 28.1621 52.3848 28.1621H57.0439L57.0488 80.0488H67.4951V20.0498H52.2988Z'

/**
 * The same lockup with UMO 24 px high (a unit of 0.4 px), built of separate HTML layers — the wordmark, the cobrand's
 * clip, the divider and the Y — so the fold moves layers, which Safari can run on the scroll's own thread in step with
 * a finger, where moving parts inside one SVG redraws it on the main thread and lags (index.css; `setUmoYLayers`
 * without scroll timelines). The box is the wordmark's, 200 wide unfolded; the Y's circle overhangs it 8 above and below.
 */
export function UmoYLayers({ title }: { title?: string }) {
  return (
    <div role={title ? 'img' : undefined} aria-label={title} className="relative h-6 w-[200px]" data-umo-y-layers>
      <svg viewBox="0 0 300 60" fill="currentColor" aria-hidden className="absolute top-0 left-0 h-6 w-[120px]">
        {UMO_PATHS.map(d => <path key={d} d={d} />)}
        <path fillRule="evenodd" clipRule="evenodd" d={UMO_O} />
      </svg>
      <div data-layer="cobrand" className="absolute top-[-8px] left-0 h-10 w-[60.4px] origin-top-left overflow-hidden will-change-transform" style={{ transform: 'translateX(139.6px)' }}>
        <div data-layer="divider" className="absolute top-2 left-[-0.4px] h-6 w-[0.8px] bg-current will-change-transform" style={{ transform: 'translateX(0.4px)' }} />
        <svg data-layer="y" viewBox="0 0 100 100" fill="currentColor" aria-hidden className="absolute top-0 left-0 size-10 will-change-transform" style={{ transform: 'translateX(20.4px)' }}>
          <path fillRule="evenodd" clipRule="evenodd" d={Y_PATH} />
        </svg>
      </div>
    </div>
  )
}

/** The fold of UmoYLayers by `t` from 0 to 1 by script, for browsers without scroll timelines. */
export function setUmoYLayers(el: HTMLElement, t: number) {
  const k = Math.min(1, Math.max(0, t))
  const d = Math.min(1, Math.max(0, (t - 0.3) / 0.4))
  const set = (name: string, transform: string) => { const n = el.querySelector<HTMLElement | SVGElement>(`[data-layer="${name}"]`); if (n) n.style.transform = transform }
  set('cobrand', `translateX(${139.6 - 28 * k}px)`)
  set('divider', `translateX(${0.4 - 0.8 * d}px)`)
  set('y', `translateX(${20.4 - 44.4 * k}px) rotate(${-90 * k}deg) scale(${1 - 0.54 * k})`)
}
