import { LOGO } from './logo'

/**
 * Компостер's wordmark, the dots of `logo.ts`. Takes its colour from `currentColor`, so set it with a text-* class.
 */
export default function Wordmark({ className = '', title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox={`0 0 ${LOGO.w} ${LOGO.h}`}
      fill="currentColor"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={`block aspect-[8/1] ${className}`}
    >
      <path d={LOGO.d} />
    </svg>
  )
}
