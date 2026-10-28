import { LOGO } from './logo'

/**
 * Evrone's wordmark, the geometry of public/downloads/evrone-logo-b.svg cut to its ink (`logo.ts`).
 * Takes its colour from `currentColor`, so set it with a text-* class.
 */
export default function Wordmark({ className = '', title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox={`0 0 ${LOGO.w} ${LOGO.h}`}
      fill="currentColor"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={`block aspect-[1600/297] ${className}`}
    >
      <path d={LOGO.d} />
    </svg>
  )
}
