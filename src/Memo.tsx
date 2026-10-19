import { flushSync } from 'react-dom'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Field as Labelled, ComboField, TextArea, TextInput, GeneratorHeader, DownloadBar, LinkButtons, canShareFiles, unfilled, itemOf, rowAction, ALERT_LABEL, outlined } from '@/ui/form'
import { useStaff, plain, AddTile, ItemFrame, Removed, ItemAlert, ITEM_EDGE } from '@/ui/staff'
import { goal } from '@/ui/metrika'
import { toD, type Cmd } from '@/livery/geometry'
import { loadFonts } from '@/nametag/tag'
import { siteFor, maskPhone } from '@/card/card'
import { MEMOS_KEY, PAGE, DEALER_FIELDS, buildBlock, type Dealer, type MemoField, type Person } from '@/memo/memo'
import type { MemoFonts } from '@/memo/text'
import page1 from '@/assets/memo/page-1.svg'
import page2 from '@/assets/memo/page-2.svg'
import { POSITION_OPTIONS } from '@/data/positions'
import { DEALER_NAMES, dealerFilter, dealerOf, withoutUmo, phoneOf } from '@/data/dealers'
import { isPdf, readPdfData } from '@/ui/pdfData'
import { MobileEditor, usePhone } from '@/ui/mobile'

// Owner's memo generator (Figma: UMO | Evrone, section 5222:5427): two A4 pages a dealership hands over with a car,
// Figma's but for the contacts at the foot of the second, which are set here: the dealership once for the list, a
// consultant per memo, as the business card's staff (`useStaff`). «Скачать PDF» gives the memos in outlines,
// «Скачать шаблон», beside «Добавить», the same with every text live in CoFo Sans, to be edited where the font is.

const BLANK: Person = { position: 'Мастер-консультант', name: '', phone: '', email: '' }
/** Shown grey on the page in place of an empty required field; in the template as they are */
const PLACEHOLDER: Partial<Record<MemoField, string>> = {
  dealer: 'Название дилера', address: 'Адрес', dealerPhone: 'Телефон', site: 'Сайт',
  position: 'Должность', name: 'Фамилия Имя Отчество', phone: 'Телефон',
}
const MISSING: Partial<Record<MemoField, string>> = {
  dealer: 'Нет названия дилера', address: 'Нет адреса', dealerPhone: 'Нет телефона дилера', site: 'Нет сайта',
  position: 'Нет должности', name: 'Нет имени', phone: 'Нет телефона',
}
const UNFILLED: Partial<Record<MemoField, string>> = {
  dealer: 'Выбрать дилера', address: 'Указать адрес', dealerPhone: 'Указать телефон дилера', site: 'Указать сайт',
  position: 'Указать должность', name: 'Добавить имя', phone: 'Указать телефон',
}
const PERSON_FIELDS: MemoField[] = ['position', 'name', 'phone', 'email']
const PERSON_REQUIRED = ['position', 'name', 'phone'] as const
const DEALER_REQUIRED = ['dealer', 'address', 'dealerPhone', 'site'] as const

/** The dealership as typed: the site follows the name until it's edited (null) */
type DealerInput = Omit<Dealer, 'site'> & { site: string | null }
/** What the memos were made from, kept in their PDF (`MEMOS_KEY`) */
interface MemosData { dealer: DealerInput; people: Person[] }

const NO_DEALER: DealerInput = { name: '', address: '', phone: '', email: '', site: null }
const DEALER_OPTIONS = DEALER_NAMES.map(withoutUmo)
const addressOf = (name: string) => dealerOf(name)?.address || undefined
const salonPhone = (name: string) => { const p = phoneOf(name); return p ? maskPhone(p).text : undefined }

/** The phone field's live mask, the caret kept after the same digit */
function phoneChange(v: string, set: (text: string) => void) {
  const el = document.activeElement as HTMLInputElement
  const before = v.slice(0, el.selectionStart ?? v.length).replace(/\D/g, '').length
  const { text, caret } = maskPhone(v, before)
  set(text)
  requestAnimationFrame(() => { if (document.activeElement === el) el.setSelectionRange(caret, caret) })
}

const save = (blob: Blob, name: string) => {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

/** A page of the memo: Figma's art under the contacts, `text` black, `alert` red, `ghost` grey */
function Sheet({ src, text, alert, ghost }: { src: string; text?: string; alert?: string; ghost?: string }) {
  return (
    <div className="relative bg-white">
      <img src={src} alt="" className="block w-full" style={{ aspectRatio: `${PAGE.w} / ${PAGE.h}` }} draggable={false} />
      {(text || alert || ghost) && (
        <svg viewBox={`0 0 ${PAGE.w} ${PAGE.h}`} className="absolute inset-0 block size-full" aria-hidden>
          {ghost && <path d={ghost} fill="#a6a6a6" />}
          {text && <path d={text} fill="#000" />}
          {alert && <path d={alert} fill="#e30" />}
        </svg>
      )}
    </div>
  )
}

export default function Memo() {
  const [input, setDealer] = useState<DealerInput>(NO_DEALER)
  const dealer: Dealer = { ...input, site: input.site ?? siteFor(input.name) }
  const [dealerOpen, setDealerOpen] = useState(false)

  const staff = useStaff<Person>({
    columns: { position: 'Должность', name: 'ФИО', phone: 'Телефон', email: 'Почта' },
    blank: BLANK,
    // The memos' own PDF brings back the dealership and the consultants, to change a line and download again
    readFile: data => {
      const bytes = new Uint8Array(data)
      const d = isPdf(bytes) ? readPdfData(bytes, MEMOS_KEY) as MemosData | undefined : undefined
      if (!d?.people?.length) throw new Error('В файле нет памяток: подходят PDF, скачанные здесь')
      setDealer({ ...NO_DEALER, ...d.dealer, site: d.dealer?.site ?? null })
      return d.people.map(p => ({ ...BLANK, ...p }))
    },
    readPasted: () => [],
    accept: '.pdf,application/pdf',
    uploadLabel: 'Загрузить PDF',
  })
  const { mode, current, update } = staff
  staff.useKeys(false)
  const items = staff.items

  const [fonts, setFonts] = useState<MemoFonts>()
  const [exporting, setExporting] = useState(false)
  const [templating, setTemplating] = useState(false)
  const phone = usePhone()
  useEffect(() => { loadFonts().then(f => setFonts({ r: f.regular, m: f.medium })) }, [])

  useEffect(() => {
    const prev = document.title
    document.title = 'Памятка владельца UMO'
    return () => { document.title = prev }
  }, [])

  /** The dealership's and a person's fields with placeholders standing in for the empty required ones */
  const shown = (p: Person) => {
    const ghost = new Set<MemoField>()
    const or = (field: MemoField, v: string) => {
      if (v.trim() || !PLACEHOLDER[field]) return v
      ghost.add(field)
      return PLACEHOLDER[field]!
    }
    return {
      ghost,
      dealer: { name: or('dealer', dealer.name), address: or('address', dealer.address), phone: or('dealerPhone', dealer.phone), email: dealer.email, site: or('site', dealer.site) },
      person: { position: or('position', p.position), name: or('name', p.name), phone: or('phone', p.phone), email: p.email },
    }
  }

  const memos = useMemo(() => fonts ? items.map(p => {
    const s = shown(p)
    const block = buildBlock(fonts, s.dealer, s.person)
    return { block, ghost: s.ghost, issues: block.issues.filter(i => !i.field || !s.ghost.has(i.field)) }
  }) : undefined, [fonts, items, input]) // eslint-disable-line react-hooks/exhaustive-deps

  const dealerMissing = DEALER_REQUIRED.filter(f => !(f === 'dealer' ? dealer.name : f === 'dealerPhone' ? dealer.phone : dealer[f]).trim())
  const dealerFaults = memos?.[0]?.issues.filter(i => i.field && DEALER_FIELDS.includes(i.field)) ?? []
  const dealerIssues = [...dealerMissing.map(f => MISSING[f]!), ...new Set(dealerFaults.map(i => i.text))]
  const dealerWrong = new Set<MemoField>(dealerFaults.map(i => i.field!))

  const missing = items.map(p => PERSON_REQUIRED.filter(f => !p[f].trim()))
  const personIssues = (i: number) => memos?.[i]?.issues.filter(x => !x.field || PERSON_FIELDS.includes(x.field)) ?? []
  const problems = items.map((p, i) => [...new Set([
    ...(staff.showsMissing(p.key) ? missing[i].map(f => MISSING[f]!) : []),
    ...personIssues(i).map(x => x.text),
  ])])
  const failing = items.filter((_, i) => missing[i].length || personIssues(i).length).map(p => p.key)
  const ok = !!memos && items.length > 0 && failing.length === 0 && dealerIssues.length === 0

  const dealerForm = useRef<HTMLDivElement>(null)
  const toDealer = () => {
    const at = dealerMissing[0] ?? [...dealerWrong][0] ?? 'dealer'
    if (at !== 'dealer') flushSync(() => setDealerOpen(true))
    dealerForm.current?.querySelector<HTMLElement>(`[data-field="${at}"] textarea, [data-field="${at}"] input`)?.focus()
  }

  // The address and the phone follow the dealer picked while they're empty or the previous dealer's
  const pickDealer = (v: string) => setDealer(d => ({
    ...d,
    name: v,
    address: addressOf(v) && (!d.address.trim() || d.address === addressOf(d.name)) ? addressOf(v)! : d.address,
    phone: salonPhone(v) && (!d.phone.trim() || d.phone === salonPhone(d.name)) ? salonPhone(v)! : d.phone,
  }))

  const data = (): MemosData => ({ dealer: input, people: items.map(plain) })

  const shareFile = useCallback(async () => {
    const { memosPdf } = await import('@/memo/pdf')
    return new File([await memosPdf(memos!.map(m => m.block), data())], 'UMO_owner-memo.pdf', { type: 'application/pdf' })
  }, [memos]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = async () => {
    if (!memos || !ok) return
    setExporting(true)
    try {
      const { memosPdf } = await import('@/memo/pdf')
      save(await memosPdf(memos.map(m => m.block), data()), 'UMO_owner-memo.pdf')
      goal('download_owner_memo', { count: memos.length })
    } finally {
      setExporting(false)
    }
  }

  /** The template takes what's typed, the placeholders where nothing is: it's edited anyway */
  const handleTemplate = async () => {
    if (!memos || !fonts) return
    setTemplating(true)
    try {
      const { memosTemplate } = await import('@/memo/pdf')
      save(await memosTemplate(memos.map(m => m.block), fonts), 'UMO_owner-memo_template.pdf')
      goal('download_owner_memo_template', { count: memos.length })
    } finally {
      setTemplating(false)
    }
  }

  const problemOf = (i: number) => personIssues(i)[0]?.text ?? (missing[i].length ? unfilled(missing[i].map(f => UNFILLED[f]!)) : undefined)

  /** `spread`: the memo as it prints, the first page beside the consultant's second, on wide screens */
  const renderItem = (p: typeof items[number], i: number, spread = false) => {
    const memo = memos?.[i]
    const active = mode === 'manual' && p.key === current?.key
    const dimmed = mode === 'manual' && !!current && !active && !phone
    const wrong = new Set<MemoField>([...dealerWrong, ...(memo?.issues.map(x => x.field).filter((f): f is MemoField => !!f) ?? [])])
    const paths = (only: (f: MemoField) => boolean) => memo
      ? (Object.entries(memo.block.fields) as [MemoField, Cmd[]][]).filter(([f]) => only(f)).flatMap(([, c]) => c)
      : []
    return (
      <Fragment key={p.key}>
        <Removed staff={staff} at={i} />
        <figure ref={staff.figureRef(p.key)} onClick={() => staff.pick(p.key)} className="group/row flex cursor-pointer justify-center">
          <div className={`flex w-full flex-col gap-3 ${spread ? 'max-w-[1216px]' : 'max-w-[600px]'}`}>
            <ItemFrame staff={staff} item={p} n={i + 1}>
              <button
                type="button"
                aria-pressed={mode === 'manual' ? active : undefined}
                className={`grid w-full cursor-pointer gap-4 ${spread ? 'grid-cols-2' : ''}`}
              >
                {/* The first page, everyone's, never dimmed */}
                {spread && <div className={ITEM_EDGE}><Sheet src={page1} /></div>}
                <div className={`${ITEM_EDGE} transition-opacity duration-150 ${dimmed ? 'opacity-40 group-hover/row:opacity-100' : ''}`}>
                <Sheet
                  src={page2}
                  text={memo ? toD(paths(f => !memo.ghost.has(f) && !wrong.has(f))) : undefined}
                  alert={memo ? toD(paths(f => !memo.ghost.has(f) && wrong.has(f))) : undefined}
                  ghost={memo ? toD(paths(f => memo.ghost.has(f))) : undefined}
                />
                </div>
              </button>
            </ItemFrame>
            {problems[i].length > 0 && <ItemAlert staff={staff} item={p.key}>{problems[i].join(' · ')}</ItemAlert>}
          </div>
        </figure>
      </Fragment>
    )
  }

  const field = (key: MemoField, label: string, node: React.ReactNode) => (
    <div data-field={key}><Labelled label={label}>{node}</Labelled></div>
  )

  const sidebar = (
    <div className="flex flex-col gap-6 p-6 tracking-[-0.01em] md:pb-2">
      <GeneratorHeader current="/memo" />
      <div className="flex flex-col gap-4 tracking-normal">
        {/* The dealership: the whole list's */}
        <div ref={dealerForm} className="flex flex-col gap-4">
          <div data-field="dealer" className="group/field flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className={`text-[14px] leading-4 text-[#808080] ${ALERT_LABEL}`}>Дилер</p>
              <button type="button" onClick={() => setDealerOpen(o => !o)} aria-expanded={dealerOpen} className={rowAction}>
                {dealerOpen ? 'Свернуть' : 'Редактировать'}
              </button>
            </div>
            <ComboField value={dealer.name} onChange={pickDealer} options={DEALER_OPTIONS} filter={dealerFilter} singleLine placeholder="Название дилера" label="Дилеры UMO" invalid={dealerWrong.has('dealer')} />
          </div>
          {dealerOpen && <>
            {field('address', 'Адрес', <TextArea value={input.address} onChange={v => setDealer(d => ({ ...d, address: v }))} placeholder="Адрес" invalid={dealerWrong.has('address')} />)}
            {field('dealerPhone', 'Телефон', <TextInput value={input.phone} onChange={v => phoneChange(v, text => setDealer(d => ({ ...d, phone: text })))} placeholder="+7 987 654 32 10" inputMode="tel" invalid={dealerWrong.has('dealerPhone')} />)}
            {field('dealerEmail', 'Почта', <TextInput value={input.email} onChange={v => setDealer(d => ({ ...d, email: v }))} placeholder="Почта" inputMode="email" invalid={dealerWrong.has('dealerEmail')} />)}
            {field('site', 'Сайт', <TextInput value={dealer.site} onChange={v => setDealer(d => ({ ...d, site: v }))} placeholder="Сайт" invalid={dealerWrong.has('site')} />)}
          </>}
        </div>

        {mode === 'manual' && current && (() => {
          const p = current
          const i = items.findIndex(it => it.key === p.key)
          const issues = problems[i] ?? []
          const bad = (f: MemoField, label: string) => issues.some(t => t.startsWith(label) || t === MISSING[f])
          return (
            <div ref={staff.form} className="flex flex-col gap-4">
              <Labelled label="Должность">
                <ComboField key={p.key} value={p.position} onChange={v => update(p.key, { position: v })} options={POSITION_OPTIONS} placeholder="Должность" label="Типовые должности" invalid={bad('position', 'Должность')} />
              </Labelled>
              <Labelled label="ФИО">
                <TextInput value={p.name} onChange={v => update(p.key, { name: v })} placeholder="Фамилия Имя Отчество" invalid={bad('name', 'Имя')} />
              </Labelled>
              <Labelled label="Телефон">
                <TextInput value={p.phone} onChange={v => phoneChange(v, text => update(p.key, { phone: text }))} placeholder="+7 987 654 32 10" inputMode="tel" invalid={bad('phone', 'Телефон')} />
              </Labelled>
              <Labelled label="Почта">
                <TextInput value={p.email} onChange={v => update(p.key, { email: v })} placeholder="Почта" inputMode="email" invalid={bad('email', 'Почта')} />
              </Labelled>
            </div>
          )
        })()}
      </div>
    </div>
  )

  const download = (
    <DownloadBar
      format="PDF"
      onClick={handleExport}
      busy={exporting}
      disabled={!ok}
      note={(dealerMissing.length ? unfilled(dealerMissing.map(f => UNFILLED[f]!)) : dealerIssues[0]) ?? problemOf(failing.length ? staff.inWork(failing).index : 0)}
      count={!dealerIssues.length && failing.length ? itemOf(staff.inWork(failing).index, items.length) : undefined}
      onNote={dealerIssues.length ? toDealer : () => staff.nextOf(failing)}
      links={canShareFiles && <LinkButtons incomplete={!ok} file={shareFile} fileOnly />}
    />
  )

  const first = <div className="outline-1 outline-black/10"><Sheet src={page1} /></div>

  if (phone) return <MobileEditor slides={[{ key: 'first', number: 0, label: 'Первый лист', ratio: PAGE.h / PAGE.w, node: first }, ...items.map((p, i) => ({ key: p.key, item: p.key, number: i + 1, label: p.name.trim() || 'Второй лист', ratio: PAGE.h / PAGE.w, node: renderItem(p, i) }))]} sidebar={sidebar} download={download} staff={staff} />

  return (
    <div className="flex min-h-dvh flex-col bg-white font-sans text-black md:h-dvh md:flex-row">
      <aside className="relative flex shrink-0 flex-col md:h-full md:w-[321px] md:overflow-y-auto md:border-r md:border-black/10">
        {sidebar}
        {download}
      </aside>
      <main
        {...staff.dropTarget}
        onClick={e => { if (!(e.target as Element).closest('figure, [data-add], [data-template]')) staff.setSelected(null) }}
        className={`flex flex-1 flex-col bg-[#f5f5f5] px-2 py-6 pb-[88px] md:min-w-0 md:overflow-y-auto md:p-16 ${staff.dragging ? 'outline-2 -outline-offset-8 outline-dashed outline-black' : ''}`}
      >
        <div className="m-auto grid w-full grid-cols-1 gap-8">
          {items.map((p, i) => renderItem(p, i, true))}
          <Removed staff={staff} at={items.length} />
          <AddTile onClick={() => staff.add()}>
            <button type="button" data-template onClick={handleTemplate} disabled={!memos || templating} className={`${outlined} flex-none`}>
              {templating ? 'Собираем…' : 'Скачать шаблон'}
            </button>
          </AddTile>
        </div>
      </main>
    </div>
  )
}
