import Wordmark from './Wordmark'
/** The wordmark's box alone: the header's fold takes the logo as 5:1, its capitals 0.68 em, nothing overhanging */
export const LOGO_BOX = { caps: 0.68, ratio: 5, pad: 0, gap: 0 }
export default function HeaderLogo({ title }: { title?: string }) {
  return <Wordmark title={title} className="text-[calc(var(--u,0.4px)*60)]" />
}
export function setLogoFold() {}
