/**
 * UMO with the Y cobrand (Figma 5156:543), in Figma's units: the wordmark 300×60, the lockup 500×100. `setUmoY`
 * folds it by `t` from 0 (UMO | Y) to 1 (UMO alone): the cobrand slides 70 left into the O's right wall, the Y turns
 * a quarter and shrinks to 0.46 behind the cobrand's clip, the divider steps 2 left between 0.3 and 0.7, and the
 * viewBox closes from the lockup onto the wordmark, keeping 5:1.
 */
export default function UmoYLogo({ className = '', title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 500 100"
      fill="currentColor"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={`block aspect-[5/1] ${className}`}
      data-umo-y
    >
      <defs>
        <clipPath id="umo-y-clip"><rect width="151" height="100" /></clipPath>
      </defs>
      <g transform="translate(0 20)">
        <path d="M136.5 21.75H113.999V60H91.5V21.6716C91.5 6.27761 98.8099 0 113.999 0H136.5V21.75ZM181.499 0C196.683 0 204 6.26866 204 21.6716V60H181.499V21.75H159V60H136.5V21.75H159V0H181.499Z" />
        <path d="M61.5 38.25H22.5V0H0V38.3284C0 53.7313 7.32523 60 22.5188 60H61.479C76.6837 60 84 53.7224 84 38.3284V0H61.5V38.25Z" />
        <path fillRule="evenodd" clipRule="evenodd" d="M277.483 0C292.678 0 300 6.26866 300 21.6716V38.3284C300 53.7224 292.687 60 277.483 60H234.019C218.822 60 211.5 53.7313 211.5 38.3284V21.6716C211.5 6.27761 218.822 0 234.019 0H277.483ZM234 38.25H277.5V21.6716L234 21.75V38.25Z" />
      </g>
      <g data-part="cobrand" transform="translate(349 0)" clipPath="url(#umo-y-clip)">
        <path data-part="divider" transform="translate(1 20)" d="M0 0V60" stroke="currentColor" strokeWidth="2" />
        <path data-part="y" transform="translate(51 0)" fillRule="evenodd" clipRule="evenodd" d="M50 0C77.6142 0 100 22.3858 100 50C100 77.6142 77.6142 100 50 100C22.3858 100 0 77.6142 0 50C0 22.3858 22.3858 0 50 0ZM52.2988 20.0498C37.0212 20.0498 28.9904 27.9038 28.9902 39.4717C28.9902 48.7098 33.3927 54.148 41.251 59.7578L27.6103 80.0488H38.9209L54.1123 57.3418L48.8467 53.8047C42.4588 49.4888 39.3507 46.118 39.3506 38.8662C39.3506 32.4782 43.8388 28.1621 52.3848 28.1621H57.0439L57.0488 80.0488H67.4951V20.0498H52.2988Z" />
      </g>
    </svg>
  )
}

/** Figma's ease, cubic-bezier(0.75, 0, 0.25, 1); symmetric, so solving x by bisection is plenty. */
function ease(x: number) {
  if (x <= 0 || x >= 1) return Math.min(1, Math.max(0, x))
  let lo = 0, hi = 1, s = x
  for (let i = 0; i < 20; i++) {
    s = (lo + hi) / 2
    const bx = 3 * s * (1 - s) * (1 - s) * 0.75 + 3 * s * s * (1 - s) * 0.25 + s * s * s
    if (bx < x) lo = s; else hi = s
  }
  return 3 * s * s * (1 - s) + s * s * s
}

/** Returns the lockup's width in wordmark widths, 5/3 unfolded to 1 folded, to size the box so the wordmark holds still. */
export function setUmoY(svg: SVGSVGElement, t: number) {
  const k = ease(t)
  const d = ease((t - 0.3) / 0.4)
  svg.setAttribute('viewBox', `0 ${20 * k} ${500 - 200 * k} ${100 - 40 * k}`)
  svg.querySelector('[data-part="cobrand"]')?.setAttribute('transform', `translate(${349 - 70 * k} 0)`)
  svg.querySelector('[data-part="divider"]')?.setAttribute('transform', `translate(${1 - 2 * d} 20)`)
  const s = 1 - 0.54 * k
  svg.querySelector('[data-part="y"]')?.setAttribute('transform', `translate(${51 - 111 * k} 0) translate(50 50) rotate(${-90 * k}) scale(${s}) translate(-50 -50)`)
  return (500 - 200 * k) / 300
}
