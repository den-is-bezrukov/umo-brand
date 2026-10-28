import { LOGO } from './logo'

/** No partner's mark beside the logo */
export const COBRAND = false

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
