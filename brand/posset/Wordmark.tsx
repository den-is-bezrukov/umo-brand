/** Temporary text signature, set like the editor breadcrumbs. */
export default function Wordmark({ className = '', title }: { className?: string; title?: string }) {
  return <span className={`inline-block font-semibold leading-none tracking-[-0.02em] ${className}`} aria-label={title}>POSSET</span>
}
