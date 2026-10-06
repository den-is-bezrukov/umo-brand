import { useEffect, useMemo, useRef, useState } from 'react'
import { Field as Labelled, ComboField, TextArea, TextInput, UrlField, GeneratorHeader, DownloadButton, Segments, SegBtn, outlined, isValidUrl } from '@/ui/form'
import { useStaff, TableSource, UploadArea, AddTile, Progress } from '@/ui/staff'
import { toD, type Cmd } from '@/livery/geometry'
import { loadFonts, type Fonts } from '@/nametag/tag'
import { xlsxCells, pastedCells, byHeaders, type Cells } from '@/nametag/table'
import { CARD, FACE, BACK_LOGO, DEALER_FIELDS, buildBack, siteText, vcard, type CardField, type Dealer, type Person, type QrData } from '@/card/card'
import type { Order } from '@/card/pdf'
import CardArt from '@/card/CardArt'
import { POSITIONS } from '@/data/positions'
import { DEALER_NAMES, withoutUmo } from '@/data/dealers'
import dealers from '@/data/dealers.json'

// Business card generator (Figma: UMO | Evrone, section 4021:2849): the dealership set once, its staff typed on the page
// or loaded from the template, one PDF out with the face and a back per person. The staff list works as the name
// tag's (`useStaff`); the dealership and the QR are the whole list's.

const TEMPLATE = `${import.meta.env.BASE_URL}downloads/UMO_business-cards_template.xlsx`

const BLANK: Person = { name: '', surname: '', position: '', email: '', phone: '' }
/** Shown grey on the card in place of an empty required field; never in the PDF */
const PLACEHOLDER = { dealer: 'Название дилера', address: 'Адрес', name: 'Имя', surname: 'Фамилия', position: 'Должность' }
const MISSING: Partial<Record<CardField, string>> = {
  dealer: 'Нет названия дилера', address: 'Нет адреса', name: 'Нет имени', surname: 'Нет фамилии', position: 'Нет должности',
}

const HEADERS: Record<keyof Person, RegExp> = {
  name: /^имя$/i,
  surname: /^фамилия$/i,
  position: /^должность$/i,
  email: /^(почта|e-?mail|эл.*почта)$/i,
  phone: /^(телефон|тел\.?)$/i,
}
const toPeople = (rows: Cells[]): Person[] => byHeaders(rows, HEADERS)

/** The address umo.auto gives a dealer, put in when the dealer is picked */
const addressOf = (name: string) => dealers.find(d => d.name === name.trim())?.address

const PERSON_FIELDS: CardField[] = ['name', 'surname', 'position', 'email', 'phone']

export default function BusinessCard() {
  const staff = useStaff<Person>({
    blank: BLANK,
    readFile: data => toPeople(xlsxCells(data)),
    readPasted: text => toPeople(pastedCells(text)),
  })
  const { mode, setMode, people, current, update } = staff
  staff.useDeleteKey(false)

  // Not kept in the address, as the name tag's: a staff list isn't something to send as a link
  const [dealer, setDealer] = useState<Dealer>({ name: '', address: '', site: '' })
  const [qrMode, setQrMode] = useState<'link' | 'contact'>('link')
  /** The QR's link, following the site until it's edited */
  const [qrLink, setQrLink] = useState<string | null>(null)
  const [order, setOrder] = useState<Order>('face-once')

  const [fonts, setFonts] = useState<Fonts>()
  const [exporting, setExporting] = useState(false)
  useEffect(() => { loadFonts().then(setFonts) }, [])

  useEffect(() => {
    const prev = document.title
    document.title = 'Визитка UMO'
    return () => { document.title = prev }
  }, [])

  const siteLink = siteText(dealer.site) ? `https://${siteText(dealer.site)}` : ''
  const link = qrLink ?? siteLink
  const qrFor = (p: Person): QrData | null => qrMode === 'contact'
    ? { text: vcard(dealer, p), level: 'L' }
    : isValidUrl(link) ? { text: link.trim(), level: 'M' } : null

  const items = staff.items
  /** Each card as built, with the placeholders standing in for empty required fields */
  const cards = useMemo(() => fonts ? items.map(p => {
    const ghost = new Set<CardField>()
    const or = <K extends keyof typeof PLACEHOLDER>(field: K & CardField, v: string) => {
      if (v.trim()) return v
      ghost.add(field)
      return PLACEHOLDER[field]
    }
    const shownDealer = { ...dealer, name: or('dealer', dealer.name), address: or('address', dealer.address) }
    const shownPerson = { ...p, name: or('name', p.name), surname: or('surname', p.surname), position: or('position', p.position) }
    const back = buildBack(fonts, shownDealer, shownPerson, qrFor(p))
    return { back, ghost, issues: back.issues.filter(i => !i.field || !ghost.has(i.field)) }
  }) : undefined, [fonts, items, dealer, qrMode, link]) // eslint-disable-line react-hooks/exhaustive-deps

  /** The dealership's errors, the same on every card */
  const dealerMissing = (['dealer', 'address'] as const).filter(f => !(f === 'dealer' ? dealer.name : dealer.address).trim())
  const dealerIssues = [
    ...dealerMissing.map(f => MISSING[f]!),
    ...new Set(cards?.[0]?.issues.filter(i => i.field && DEALER_FIELDS.includes(i.field)).map(i => i.text) ?? []),
  ]
  const dealerWrong = new Set<CardField>(cards?.[0]?.issues.filter(i => i.field && DEALER_FIELDS.includes(i.field)).map(i => i.field!) ?? [])

  const missing = items.map(p => (['name', 'surname', 'position'] as const).filter(f => !p[f].trim()))
  const problems = items.map((p, i) => [...new Set([
    ...(staff.showsMissing(p.key) ? missing[i].map(f => MISSING[f]!) : []),
    ...(cards?.[i]?.issues.filter(x => !x.field || PERSON_FIELDS.includes(x.field)).map(x => x.text) ?? []),
  ])])
  const failing = items.filter((_, i) => missing[i].length || cards?.[i]?.issues.some(x => !x.field || PERSON_FIELDS.includes(x.field))).map(p => p.key)
  const ok = !!cards && items.length > 0 && failing.length === 0 && dealerIssues.length === 0

  const dealerForm = useRef<HTMLDivElement>(null)
  /** The dealership's first field at fault takes the focus */
  const toDealer = () => {
    const at = dealerMissing[0] ?? [...dealerWrong][0] ?? 'dealer'
    dealerForm.current?.querySelector<HTMLElement>(`[data-field="${at}"] textarea, [data-field="${at}"] input`)?.focus()
  }

  const pickDealer = (v: string) => setDealer(d => ({
    ...d,
    name: v,
    // The address follows the dealer picked while it's empty or the previous dealer's
    address: addressOf(v) && (!d.address.trim() || d.address === addressOf(d.name)) ? addressOf(v)! : d.address,
  }))

  const handleExport = async () => {
    if (!cards || !ok) return
    setExporting(true)
    try {
      const { cardsPdf } = await import('@/card/pdf')
      const blob = await cardsPdf(cards.map(c => c.back), order)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'UMO_business-cards.pdf'
      a.click()
      URL.revokeObjectURL(a.href)
    } finally {
      setExporting(false)
    }
  }

  const face = toD(FACE)
  const showBar = dealerIssues.length > 0 || (failing.length === 0 ? items.length > 0 : items.length > 1)

  return (
    <div className="flex min-h-dvh flex-col bg-white font-sans text-black md:h-dvh md:flex-row">

      <aside className="flex shrink-0 flex-col md:h-full md:w-[321px] md:overflow-y-auto md:border-r md:border-black/10">
        <div className="flex flex-col gap-6 p-6 tracking-[-0.01em] md:pb-2">
          <GeneratorHeader current="/business-card" />

          <Segments>
            <SegBtn active={mode === 'manual'} onClick={() => setMode('manual')}>Вручную</SegBtn>
            <SegBtn active={mode === 'table'} onClick={() => setMode('table')}>Из таблицы</SegBtn>
          </Segments>

          <div className="flex flex-col gap-10 tracking-normal">
            {/* The dealership: the whole list's */}
            <div ref={dealerForm} className="flex flex-col gap-4">
              <div data-field="dealer">
                <Labelled label="Дилер">
                  <ComboField
                    value={dealer.name}
                    onChange={pickDealer}
                    options={DEALER_NAMES}
                    shownAs={withoutUmo}
                    singleLine
                    placeholder="Название дилера"
                    label="Дилеры UMO"
                    invalid={dealerWrong.has('dealer')}
                  />
                </Labelled>
              </div>
              <div data-field="address">
                <Labelled label="Адрес">
                  <TextArea value={dealer.address} onChange={v => setDealer(d => ({ ...d, address: v }))} placeholder="Адрес" invalid={dealerWrong.has('address')} />
                </Labelled>
              </div>
              <div data-field="site">
                <Labelled label="Сайт">
                  <TextInput value={dealer.site} onChange={v => setDealer(d => ({ ...d, site: v }))} placeholder="dealer.ru" invalid={dealerWrong.has('site')} />
                </Labelled>
              </div>
              <Labelled label="QR-код">
                <Segments>
                  <SegBtn active={qrMode === 'link'} onClick={() => setQrMode('link')}>Ссылка</SegBtn>
                  <SegBtn active={qrMode === 'contact'} onClick={() => setQrMode('contact')}>Контакт</SegBtn>
                </Segments>
                {qrMode === 'link' && <UrlField value={link} onChange={setQrLink} />}
              </Labelled>
            </div>

            {mode === 'manual' && current && (() => {
              const p = current
              const i = items.findIndex(it => it.key === p.key)
              const issues = problems[i] ?? []
              const bad = (field: CardField, label: string) => issues.some(t => t.startsWith(label) || t === MISSING[field])
              return (
                <div ref={staff.form} onPasteCapture={e => staff.paste(p.key, e)} className="flex flex-col gap-2">
                  <div className="flex flex-col gap-4">
                    <Labelled label="Имя">
                      <TextInput value={p.name} onChange={v => update(p.key, { name: v })} placeholder="Имя" invalid={bad('name', 'Имя')} />
                    </Labelled>
                    <Labelled label="Фамилия">
                      <TextInput value={p.surname} onChange={v => update(p.key, { surname: v })} placeholder="Фамилия" invalid={bad('surname', 'Фамилия') || issues.some(t => t.startsWith('Имя и фамилия'))} />
                    </Labelled>
                    <Labelled label="Должность">
                      <ComboField key={p.key} value={p.position} onChange={v => update(p.key, { position: v })} options={POSITIONS} placeholder="Должность" label="Типовые должности" invalid={bad('position', 'Должность')} />
                    </Labelled>
                    <Labelled label="Почта">
                      <TextInput value={p.email} onChange={v => update(p.key, { email: v })} placeholder="name@dealer.ru" invalid={bad('email', 'Почта')} />
                    </Labelled>
                    <Labelled label="Телефон">
                      <TextInput value={p.phone} onChange={v => update(p.key, { phone: v })} placeholder="+7 495 000 00 00 доб. 123" invalid={bad('phone', 'Телефон')} />
                    </Labelled>
                  </div>
                  {(!staff.isBlank(p) || people.length > 1) && (
                    <div className="mt-2 flex gap-2">
                      {!staff.isBlank(p) && <button type="button" onClick={() => update(p.key, BLANK)} className={outlined}>Сбросить</button>}
                      {people.length > 1 && <button type="button" onClick={() => staff.remove(p.key)} className={outlined}>Удалить</button>}
                    </div>
                  )}
                </div>
              )
            })()}

            {mode === 'table' && <TableSource staff={staff} template={TEMPLATE} />}

            <Labelled label="Страницы">
              <Segments>
                <SegBtn active={order === 'face-once'} onClick={() => setOrder('face-once')}>Лицо один раз</SegBtn>
                <SegBtn active={order === 'pairs'} onClick={() => setOrder('pairs')}>Лицо к каждой</SegBtn>
              </Segments>
            </Labelled>
          </div>
        </div>

        {showBar && <div className="fixed inset-x-0 bottom-0 z-10 bg-white p-6 md:sticky md:mt-8 md:pt-0">
          {/* The dealership first, as every card needs it; then the cards in work, as the name tag counts them */}
          {dealerIssues.length > 0 ? (
            <button type="button" onClick={toDealer} className="flex w-full cursor-pointer items-center justify-center p-3 text-[14px] leading-[1.13] tracking-[-0.01em] text-[#999] hover:text-black">
              {dealerIssues[0]}
            </button>
          ) : failing.length > 0 ? items.length > 1 && (
            <Progress failing={failing.length} total={items.length} onClick={() => staff.nextOf(failing)} />
          ) : items.length > 0 && (
            <DownloadButton onClick={handleExport} busy={exporting} disabled={!ok}>
              Скачать{items.length > 1 ? ` ${items.length} ${cardsWord(items.length)}` : ''}
            </DownloadButton>
          )}
        </div>}
      </aside>

      <main
        {...(mode === 'table' ? staff.dropTarget : {})}
        onClick={e => { if (mode === 'manual' && !(e.target as Element).closest('figure, [data-add]')) staff.setSelected(null) }}
        className={`flex flex-1 flex-col bg-[#f5f5f5] p-6 pb-[112px] md:min-w-0 md:overflow-y-auto md:p-16
          ${mode === 'table' && staff.file && staff.dragging ? 'outline-2 -outline-offset-8 outline-dashed outline-black' : ''}`}
      >
        {mode === 'table' && !staff.file ? (
          <UploadArea staff={staff} />
        ) : (
        <div className="m-auto grid w-full grid-cols-1 gap-8">
          {/* The face, the same for everyone */}
          <div className="flex justify-center">
            <div className={`w-full max-w-[480px] transition-opacity duration-150 ${mode === 'manual' && current ? 'opacity-40' : ''}`}>
              <CardArt text={face} />
            </div>
          </div>
          {items.map((p, i) => {
            const card = cards?.[i]
            const active = mode === 'manual' && p.key === current?.key
            const dimmed = mode === 'manual' && !!current && !active
            const wrong = new Set<CardField>([...dealerWrong, ...(card?.issues.map(x => x.field).filter((f): f is CardField => !!f) ?? [])])
            const paths = (only: (f: CardField) => boolean) => card
              ? (Object.entries(card.back.fields) as [CardField, Cmd[]][]).filter(([f]) => only(f)).flatMap(([, c]) => c)
              : []
            return (
              <figure key={p.key} ref={staff.figureRef(p.key)} onClick={() => staff.pick(p.key)} className="group/row flex cursor-pointer justify-center">
                <div className="flex w-full max-w-[480px] flex-col gap-3">
                  <button
                    type="button"
                    aria-pressed={mode === 'manual' ? active : undefined}
                    className={`block w-full cursor-pointer outline-offset-4 transition-opacity duration-150
                      ${active ? 'outline-2 outline-black' : 'outline-1 outline-transparent group-hover/row:outline-black/20'}
                      ${dimmed ? 'opacity-40 group-hover/row:opacity-100' : ''}`}
                  >
                    <CardArt
                      text={card ? toD([...BACK_LOGO, ...card.back.qr, ...paths(f => !card.ghost.has(f) && !wrong.has(f))]) : undefined}
                      alert={card ? toD(paths(f => !card.ghost.has(f) && wrong.has(f))) : undefined}
                      ghost={card ? toD(paths(f => card.ghost.has(f))) : undefined}
                    />
                  </button>
                  {problems[i].length > 0 && <p className="text-[13px] leading-5 text-[#e30]">{problems[i].join(' · ')}</p>}
                </div>
              </figure>
            )
          })}
          {mode === 'manual' && <AddTile onClick={staff.add} aspect={`${CARD.w} / ${CARD.h}`} />}
        </div>
        )}
      </main>

    </div>
  )
}

/** визитки, визиток: «Скачать 2 визитки», «Скачать 5 визиток», «Скачать 21 визитку» */
function cardsWord(n: number): string {
  const d = n % 10
  const dd = n % 100
  if (d === 1 && dd !== 11) return 'визитку'
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return 'визитки'
  return 'визиток'
}
