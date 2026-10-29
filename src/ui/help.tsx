import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTypograf } from '@/guide/typograf'
import { goal } from './metrika'
import Dialog from './Dialog'
import { ChevronIcon } from './icons'
import { linkParams } from './share'
import { CopyLink, DOMAIN, type Help } from './helpParts'
import { GENERAL, HELP, MAKES } from '@brand/help'


const H = 'text-[16px] font-medium leading-5 tracking-[-0.01em]'

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {items.map((s, i) => <li key={i} className="flex gap-2"><span className="w-4 shrink-0 tabular-nums text-caption">{i + 1}</span><span>{s}</span></li>)}
    </ol>
  )
}

function Part({ title, children }: { title: string; children: ReactNode }) {
  return <section className="flex flex-col gap-3"><h3 className={H}>{title}</h3>{children}</section>
}

function Generator({ help }: { help: Help }) {
  return (
    <>
      <p>{help.what}</p>
      <Part title="Шаги"><Steps items={help.steps} /></Part>
      {help.table && <Part title="Из таблицы"><Steps items={help.table} /></Part>}
      <Part title="Печать">{help.print.map((p, i) => <p key={i}>{p}</p>)}</Part>
      {help.faq.length > 0 && <Part title="Вопросы"><Faq items={help.faq} /></Part>}
    </>
  )
}

function Faq({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="flex flex-col gap-4">
      {items.map(([q, a]) => <div key={q}><dt className="font-medium">{q}</dt><dd>{a}</dd></div>)}
    </dl>
  )
}

/**
 * «Инструкция» in the site's dialog (`Dialog`, as the guide's «Редактор материалов»), 560 px wide, opened on the page's
 * own and titled with what's being made: «Как сделать рамку номера» and a combobox's chevron, «Общие вопросы» for what
 * they share. The made thing and the chevron open the list of instructions in the dialog's body, in place of the text,
 * as «Редактор материалов» in the form's header opens the generators: 24 px Medium, 16 apart, the open one black, the
 * rest #bfbfbf; a pick shows that instruction from its top; the title again or Esc fold the list back (not a ring of
 * tabs under the title, a combobox's list over the text or «Все инструкции» at the foot)
 */
function HelpPanel({ page, tabs, onClose, initial = page }: { page: string; tabs: { path: string; title: string }[]; onClose: () => void; initial?: string }) {
  const [tab, setTab] = useState(initial)
  const [menu, setMenu] = useState(false)
  const body = useRef<HTMLDivElement>(null)
  useTypograf(body)
  useEffect(() => {
    if (!menu) return
    // On the document, so the dialog's Esc on the window doesn't hear it
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setMenu(false) } }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [menu])
  const pick = (t: string) => {
    setTab(t)
    setMenu(false)
    const dim = body.current?.closest<HTMLElement>('[data-dim]')
    if (dim) dim.scrollTop = 0
  }
  const items = [...tabs, { path: 'general', title: 'Общие вопросы' }]
  const help = HELP[tab]
  const toggle = (
    <button type="button" aria-expanded={menu} onClick={() => setMenu(!menu)} className="inline-flex cursor-pointer items-center gap-2 text-left">
      {MAKES[tab] ?? 'Общие вопросы'}
      <ChevronIcon open={menu} />
    </button>
  )
  const name = 'text-[24px] font-medium leading-6 tracking-[-0.01em] text-left'
  return (
    <Dialog title={MAKES[tab] ? <>Как сделать {toggle}</> : toggle} onClose={onClose} width={560}>
      <div ref={body} className="flex flex-col gap-8 text-[14px] leading-5 font-normal tracking-normal">
        {menu ? (
          <nav aria-label="Инструкции" className="flex flex-col items-start gap-4">
            {items.map(i => i.path === tab
              ? <button key={i.path} type="button" aria-current="true" onClick={() => setMenu(false)} className={`${name} cursor-pointer`}>{i.title}</button>
              : <button key={i.path} type="button" onClick={() => pick(i.path)} className={`${name} cursor-pointer text-faint hover:text-caption active:text-caption`}>{i.title}</button>)}
          </nav>
        ) : <>
          {help ? <Generator help={help} /> : GENERAL.map(([q, a]) => <Part key={q} title={q}><p>{a}</p></Part>)}
          {/* The instruction's own link, to send: the generator with it open (`?help`; «Общие вопросы» from this page) */}
          <p>Ссылка на инструкцию: <CopyLink href={help ? `https://${DOMAIN}${tab}?help` : `https://${DOMAIN}${page}?help=general`}>{help ? `${DOMAIN}${tab}?help` : `${DOMAIN}${page}?help=general`}</CopyLink></p>
        </>}
      </div>
    </Dialog>
  )
}

/** The «?» at the end of the breadcrumbs, in their type */
export default function HelpButton({ page, tabs }: { page: string; tabs: { path: string; title: string }[] }) {
  // `help` in the link opens it at once, on this page's instruction (`help=general`: «Общие вопросы»)
  const [initial] = useState(() => (linkParams().get('help') === 'general' ? 'general' : page))
  const [open, setOpen] = useState(() => {
    const has = linkParams().has('help')
    if (has) goal('open_help', { page, via: 'link' })
    return has
  })
  const close = useCallback(() => {
    setOpen(false)
    // Closed, it isn't opened again by a reload
    const url = new URL(window.location.href)
    if (url.searchParams.has('help')) { url.searchParams.delete('help'); window.history.replaceState(window.history.state, '', url) }
  }, [])
  const toggle = () => { if (!open) goal('open_help', { page }); setOpen(!open) }
  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label="Инструкция"
        title="Инструкция"
        className={`relative ml-auto shrink-0 cursor-pointer text-[14px] font-medium leading-4 after:absolute after:-inset-[10px] after:content-[''] ${open ? 'text-ink' : 'text-caption hover:text-ink'}`}
      >
        ?
      </button>
      {open && <HelpPanel page={page} tabs={tabs} onClose={close} initial={initial} />}
    </>
  )
}
