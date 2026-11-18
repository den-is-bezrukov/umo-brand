import Wordmark from './Wordmark'
export const COBRAND = false
export default function HeaderLogo({ title }: { title?: string }) {
  return <Wordmark title={title} className="text-[calc(var(--u,0.4px)*60)]" />
}
export function setLogoFold() {}
