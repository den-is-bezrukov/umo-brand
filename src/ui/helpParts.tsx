import { useEffect, useState, type ReactNode } from 'react'
import { LinkIcon } from './icons'
import { SUPPORT_BOT, TEXT_LINK } from './links'
import { MOD } from './keys'
import { SITE } from '@/site'

// What the instructions' texts are written with, the core's and the brand's alike (`@brand/help`)

/** The site's domain, the brand's own site, its name and files' prefix, as the instructions write them */
export const DOMAIN = SITE.domain
export const HOME = new URL(SITE.home).host
export const NAME = SITE.name
export const FILE = SITE.file

/** Illustrator's «Показать все монтажные области», as the point's keyboard has it */
export const FIT_ALL = MOD === '⌘' ? '⌥⌘0' : 'Alt+Ctrl+0'

/**
 * An instruction (`@brand/help`, one per generator, «Общее» for what they share): what to do, the table, the print and
 * the usual questions, for a point on their own. «Инструкция», the «?» at the end of the breadcrumbs: one panel for every generator, a tab each and
 * «Общее» for what they share, opened on the current one's: what to do, the table, the print and the usual questions,
 * for a point on their own. Help lives here, apart from the controls: no hint texts by them
 */

export type Help = {
  /** What the generator makes, one line */
  what: string
  steps: ReactNode[]
  /** The «Из документа» mode, for the lists that have one */
  table?: ReactNode[]
  print: ReactNode[]
  /** Question → answer */
  faq: [string, ReactNode][]
}

/**
 * A link to send, with its copy after it: the link icon, #808080, black on hover; copied, «Скопировано» in its place
 * for two seconds, as «Поделиться» says it
 */
export function CopyLink({ href, children }: { href: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => { if (!copied) return; const t = setTimeout(() => setCopied(false), 2000); return () => clearTimeout(t) }, [copied])
  return (
    <>
      <a href={href} target="_blank" rel="noopener" className={TEXT_LINK}>{children}</a>
      {copied
        ? <span className="ml-1 text-caption">Скопировано</span>
        : (
          <button type="button" title="Скопировать ссылку" aria-label="Скопировать ссылку" onClick={() => navigator.clipboard.writeText(href).then(() => setCopied(true))} className="ml-1 inline-flex cursor-pointer align-[-3px] text-caption hover:text-ink">
            <LinkIcon />
          </button>
        )}
    </>
  )
}

/** The brand's support bot, linked as the guide's «Контакты» link it */
export const Bot = ({ children }: { children: ReactNode }) => <a href={SUPPORT_BOT} target="_blank" rel="noopener" className={TEXT_LINK}>{children}</a>

/**
 * The editable template in «Печать»: what «Скачать шаблон» gives and the blank one's link (`src/ui/template.tsx`);
 * the memo says it its own way
 */
export const TEMPLATE = (path: string): ReactNode[] => [
  'Если типографии или производству нужно поправить текст, нажмите значок «Скачать шаблон» (стрелка вниз) у нужного макета: в PDF будет этот макет с живым текстом, пустые поля — заглушками.',
  <>Пустой шаблон всегда по ссылке <CopyLink href={`https://${DOMAIN}${path}?t`}>{`${DOMAIN}${path}?t`}</CopyLink>.</>,
]

