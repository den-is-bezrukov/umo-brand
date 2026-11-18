import { LOGO } from './logo'

/**
 * What the core's header needs to fold the logo with the scroll: `caps` the logo's height on the first screen, in the
 * brand font's capital height (an em's share), `ratio` its unfolded width over its height, `pad` and `gap` in px what
 * a part overhanging the logo's box takes on the first screen (on top, left and bottom; below lg, over the header).
 */
/** No partner's mark beside the logo: the wordmark's box alone, 5:1 as the header has taken every brand's */
export const LOGO_BOX = { caps: 0.68, ratio: 5, pad: 0, gap: 0 }

/** The guide's logo: the wordmark, 24 units of `--u` high as the core's header expects, folding with the core's scroll */
export default function HeaderLogo({ title }: { title?: string }) {
  return (
    <svg viewBox={`0 0 ${LOGO.w} ${LOGO.h}`} fill="currentColor" role={title ? 'img' : undefined} aria-label={title} className="block h-[calc(var(--u,0.4px)*60)] w-auto">
      <path d={LOGO.d} />
    </svg>
  )
}

/** Nothing to fold: the logo has no layers */
export function setLogoFold() {}
