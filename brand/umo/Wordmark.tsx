/**
 * UMO wordmark, same geometry as public/downloads/umo-logo.svg (480×96).
 * Takes its colour from `currentColor`, so set it with a text-* class.
 */
export default function UmoLogo({ className = '', title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 480 96"
      fill="currentColor"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={`block aspect-[5/1] ${className}`}
    >
      <path d="M218.401 34.8H182.399V96H146.4V34.6746C146.4 10.0442 158.096 0 182.399 0H218.401V34.8ZM290.398 0C314.693 0 326.4 10.0299 326.4 34.6746V96H290.398V34.8H254.399V96H218.401V34.8H254.399V0H290.398Z" />
      <path d="M98.4 61.2H36V0H0V61.3254C0 85.9702 11.7204 96 36.0301 96H98.3663C122.694 96 134.4 85.9558 134.4 61.3254V0H98.4V61.2Z" />
      <path fillRule="evenodd" clipRule="evenodd" d="M443.973 0C468.284 0 480 10.0299 480 34.6746V61.3254C480 85.9558 468.299 96 443.973 96H374.43C350.116 96 338.4 85.9702 338.4 61.3254V34.6746C338.4 10.0442 350.116 0 374.43 0H443.973ZM374.4 61.2H444V34.6746L374.4 34.8V61.2Z" />
    </svg>
  )
}
