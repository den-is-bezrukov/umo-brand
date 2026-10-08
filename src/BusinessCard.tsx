import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Field as Labelled, ComboField, TextArea, TextInput, UrlField, GeneratorHeader, DownloadBar, Segments, SegBtn, rowAction, isValidUrl, ALERT_LABEL, Checkbox } from '@/ui/form'
import { useStaff, TableSource, UploadArea, AddTile, inWork, fullNameField, ItemFrame, Removed, BESIDE, ITEM_EDGE } from '@/ui/staff'
import { goal } from '@/ui/metrika'
import { toD, qrOutline, type Cmd } from '@/livery/geometry'
import { loadFonts, type Fonts } from '@/nametag/tag'
import { xlsxCells, pastedCells, byHeaders, FULL_NAME, fromFullName, type Cells } from '@/nametag/table'
import { CARD, QR, FACE, BACK_LOGO, DEALER_FIELDS, buildBack, siteFor, siteText, splitPhone, type CardField, type Dealer, type Person, type QrData } from '@/card/card'
import CardArt from '@/card/CardArt'
import { POSITIONS } from '@/data/positions'
import { DEALER_NAMES, withoutUmo } from '@/data/dealers'
import dealers from '@/data/dealers.json'

// Business card generator (Figma: UMO | Evrone, section 4021:2849): the dealership set once, its staff typed on the page
// or loaded from the template, one PDF out with the face and a back per person. The staff list works as the name
// tag's (`useStaff`); the dealership and the QR are the whole list's.

const TEMPLATE = `${import.meta.env.BASE_URL}downloads/UMO_business-cards_template.xlsx`

const BLANK: Person = { name: '', surname: '', position: '', email: '', phone: '', ext: '' }
/** Shown grey on the card in place of an empty required field; never in the PDF */
const PLACEHOLDER = { dealer: 'Название дилера', address: 'Адрес', site: 'Сайт', name: 'Имя', surname: 'Фамилия', position: 'Должность', email: 'Почта', phone: 'Телефон' }
const MISSING: Partial<Record<CardField, string>> = {
  dealer: 'Нет названия дилера', address: 'Нет адреса', site: 'Нет сайта',
  name: 'Нет имени', surname: 'Нет фамилии', position: 'Нет должности', email: 'Нет почты', phone: 'Нет телефона',
}

const HEADERS: Record<keyof Person, RegExp> = {
  name: /^имя$/i,
  surname: /^фамилия$/i,
  position: /^должность$/i,
  email: /^(почта|e-?mail|эл.*почта)$/i,
  phone: /^(телефон|тел\.?)$/i,
  ext: /^(доб\.?|добавочный)$/i,
}
/** A phone cell carrying its extension («… доб. 204») fills in the extension, unless it has a column of its own */
const toPeople = (rows: Cells[]): Person[] => byHeaders(rows, { ...HEADERS, full: FULL_NAME }).map(({ full, ...row }) => {
  const p = fromFullName(row, full)
  const split = !p.ext.trim() && splitPhone(p.phone)
  return split ? { ...p, ...split } : p
})

/** The address umo.auto gives a dealer, put in when the dealer is picked */
const addressOf = (name: string) => dealers.find(d => withoutUmo(d.name) === withoutUmo(name.trim()))?.address

/**
 * The dealers as the card names them: without the «UMO» of their marketing names («АГАТ Владимир»), as the logo and
 * «Официальный дилер UMO» stand right by the name. For the full names, offer `DEALER_NAMES` as it is
 */
const DEALER_OPTIONS = DEALER_NAMES.map(withoutUmo)

/** What the grey stand-in QR holds */
const SAMPLE_LINK = 'https://umo.auto'

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
  /** The site follows the dealer's name (`siteFor`) until it's edited: null */
  const [input, setDealer] = useState<Omit<Dealer, 'site'> & { site: string | null }>({ name: '', address: '', site: null })
  const dealer: Dealer = { ...input, site: input.site ?? siteFor(input.name) }
  /** The address and the site, under «Изменить»: a dealer picked from the list fills them in */
  const [dealerOpen, setDealerOpen] = useState(false)
  // The QR as a contact (a vCard per person, `vcard` in card.ts) is off for now: the QR is a link only. To bring it
  // back, restore this state, the branch in `qrFor` and the «Ссылка / Контакт» segments in `qrField`
  // const [qrMode, setQrMode] = useState<'link' | 'contact'>('link')
  /** The QR's link, following the site until it's edited */
  const [qrLink, setQrLink] = useState<string | null>(null)
  // The face before every back (else once, before all of them), and crop marks around each card
  const [faceEach, setFaceEach] = useState(false)
  const [marks, setMarks] = useState(false)

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
  const qrFor = (_p: Person): QrData | null => /* qrMode === 'contact' ? { text: vcard(dealer, _p), level: 'L' } : */
    isValidUrl(link) ? { text: link.trim(), level: 'M' } : null

  const items = staff.items
  /** Each card as built, with the placeholders standing in for empty required fields */
  const cards = useMemo(() => fonts ? items.map(p => {
    const ghost = new Set<CardField>()
    const or = <K extends keyof typeof PLACEHOLDER>(field: K & CardField, v: string) => {
      if (v.trim()) return v
      ghost.add(field)
      return PLACEHOLDER[field]
    }
    const shownDealer = { name: or('dealer', dealer.name), address: or('address', dealer.address), site: or('site', dealer.site) }
    const shownPerson = {
      name: or('name', p.name), surname: or('surname', p.surname), position: or('position', p.position),
      email: or('email', p.email), phone: or('phone', p.phone), ext: p.ext,
    }
    const qr = qrFor(p)
    const back = buildBack(fonts, shownDealer, shownPerson, qr)
    // Without a link yet, a grey code stands in for it, as the placeholders do
    const ghostQr = qr ? [] : qrOutline(SAMPLE_LINK, QR.x, QR.y, QR.size)
    return { back, ghost, ghostQr, issues: back.issues.filter(i => !i.field || !ghost.has(i.field)) }
  }) : undefined, [fonts, items, dealer, link]) // eslint-disable-line react-hooks/exhaustive-deps

  /** The dealership's errors, the same on every card */
  const dealerMissing = (['dealer', 'address', 'site'] as const).filter(f => !(f === 'dealer' ? dealer.name : dealer[f]).trim())
  const dealerIssues = [
    ...dealerMissing.map(f => MISSING[f]!),
    ...new Set(cards?.[0]?.issues.filter(i => i.field && DEALER_FIELDS.includes(i.field)).map(i => i.text) ?? []),
  ]
  const dealerWrong = new Set<CardField>(cards?.[0]?.issues.filter(i => i.field && DEALER_FIELDS.includes(i.field)).map(i => i.field!) ?? [])

  const missing = items.map(p => (['name', 'surname', 'position', 'email', 'phone'] as const).filter(f => !p[f].trim()))
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
    if (at !== 'dealer') setDealerOpen(true)
    setTimeout(() => dealerForm.current?.querySelector<HTMLElement>(`[data-field="${at}"] textarea, [data-field="${at}"] input`)?.focus())
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
      const blob = await cardsPdf(cards.map(c => c.back), { faceEach, marks })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'UMO_business-cards.pdf'
      a.click()
      // The QR link goes along when it isn't the site made up from the dealer's name: what dealers put there
      const ownLink = link.trim() !== `https://${siteText(siteFor(dealer.name))}`
      goal('download_business_card', { count: cards.length, faceEach, marks, ...(ownLink && { link: link.trim().slice(0, 300) }) })
      URL.revokeObjectURL(a.href)
    } finally {
      setExporting(false)
    }
  }

  const face = toD(FACE)
  /** The QR, the whole list's: with the dealership, under «Изменить» after the site it follows */
  const qrField = (
    <Labelled label="QR-код">
      {/* <Segments>
        <SegBtn active={qrMode === 'link'} onClick={() => setQrMode('link')}>Ссылка</SegBtn>
        <SegBtn active={qrMode === 'contact'} onClick={() => setQrMode('contact')}>Контакт</SegBtn>
      </Segments> */}
      <UrlField value={link} onChange={setQrLink} />
    </Labelled>
  )
  /** A card's first fault, its empty fields included while it's fresh */
  const problemOf = (i: number) => [...(cards?.[i]?.issues.filter(x => !x.field || PERSON_FIELDS.includes(x.field)).map(x => x.text) ?? []), ...missing[i].map(f => MISSING[f]!)][0]

  return (
    <div className="flex min-h-dvh flex-col bg-white font-sans text-black md:h-dvh md:flex-row">

      <aside className="flex shrink-0 flex-col md:h-full md:w-[321px] md:overflow-y-auto md:border-r md:border-black/10">
        <div className="flex flex-col gap-6 p-6 tracking-[-0.01em] md:pb-2">
          <GeneratorHeader current="/business-card" />

          <Labelled label="Данные">
            <Segments>
              <SegBtn active={mode === 'manual'} onClick={() => setMode('manual')}>Вручную</SegBtn>
              <SegBtn active={mode === 'table'} onClick={() => setMode('table')}>Из таблицы</SegBtn>
            </Segments>
          </Labelled>

          {/* The dealership and the person in one column, 16 px apart as any fields; the pages, the whole file's, set apart */}
          <div className="flex flex-col gap-4 tracking-normal">
            {/* The dealership: the whole list's */}
            <div ref={dealerForm} className="flex flex-col gap-4">
              <div data-field="dealer" className="group/field flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-[14px] leading-4 text-[#999] ${ALERT_LABEL}`}>Дилер</p>
                  <button type="button" onClick={() => setDealerOpen(o => !o)} aria-expanded={dealerOpen} className={rowAction}>
                    {dealerOpen ? 'Свернуть' : 'Редактировать'}
                  </button>
                </div>
                  <ComboField
                    value={dealer.name}
                    onChange={pickDealer}
                    options={DEALER_OPTIONS}
                    singleLine
                    placeholder="Название дилера"
                    label="Дилеры UMO"
                    invalid={dealerWrong.has('dealer')}
                  />
              </div>
              {dealerOpen && <>
              <div data-field="address">
                <Labelled label="Адрес">
                  <TextArea value={input.address} onChange={v => setDealer(d => ({ ...d, address: v }))} placeholder="Адрес" invalid={dealerWrong.has('address')} />
                </Labelled>
              </div>
              <div data-field="site">
                <Labelled label="Сайт">
                  <TextInput value={dealer.site} onChange={v => setDealer(d => ({ ...d, site: v }))} placeholder="Сайт" invalid={dealerWrong.has('site')} />
                </Labelled>
              </div>
              {qrField}
              </>}
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
                      <TextInput value={p.name} onChange={v => update(p.key, { name: v })} {...fullNameField(p, s => update(p.key, s))} placeholder="Имя" invalid={bad('name', 'Имя')} />
                    </Labelled>
                    <Labelled label="Фамилия">
                      <TextInput value={p.surname} onChange={v => update(p.key, { surname: v })} placeholder="Фамилия" invalid={bad('surname', 'Фамилия') || issues.some(t => t.startsWith('Имя и фамилия'))} />
                    </Labelled>
                    <Labelled label="Должность">
                      <ComboField key={p.key} value={p.position} onChange={v => update(p.key, { position: v })} options={POSITIONS} placeholder="Должность" label="Типовые должности" invalid={bad('position', 'Должность')} />
                    </Labelled>
                    <Labelled label="Почта">
                      <TextInput value={p.email} onChange={v => update(p.key, { email: v })} placeholder="Почта" invalid={bad('email', 'Почта')} />
                    </Labelled>
                    <Labelled label="Телефон">
                      {/* The number takes only what a number is written with; a whole one pasted with its extension
                          splits, the extension going to its own field */}
                      <div className="flex gap-2">
                        <TextInput
                          value={p.phone}
                          onChange={v => update(p.key, splitPhone(v) ?? { phone: v.replace(/[^\d+()\-\s]/g, '') })}
                          placeholder="Телефон"
                          inputMode="tel"
                          invalid={bad('phone', 'Телефон')}
                        />
                        <div className="w-[88px] shrink-0">
                          <TextInput
                            value={p.ext}
                            onChange={v => update(p.key, { ext: v.replace(/\D/g, '').slice(0, 6) })}
                            placeholder="Доб."
                            inputMode="numeric"
                          />
                        </div>
                      </div>
                    </Labelled>
                  </div>
                </div>
              )
            })()}

            {mode === 'table' && <TableSource staff={staff} template={TEMPLATE} />}

            {/* The whole file's, set apart */}
            <div className="mt-6 flex flex-col gap-4">
              {/* With one card the face goes once either way */}
              {items.length > 1 && <Checkbox checked={faceEach} onChange={setFaceEach}>Обложка у всех</Checkbox>}
              <Checkbox checked={marks} onChange={setMarks}>Метки реза</Checkbox>
            </div>
          </div>
        </div>

        {/* The dealership first, as every card needs it; then the cards in work, as the name tag counts them */}
        <DownloadBar
          format="PDF"
          onClick={handleExport}
          busy={exporting}
          disabled={!ok}
          note={dealerIssues[0] ?? (!items.length ? 'Нет таблицы' : items.length > 1 ? inWork(failing.length, items.length) : problemOf(0))}
          onNote={dealerIssues.length ? toDealer : items.length ? () => staff.nextOf(failing) : undefined}
          className="md:mt-8"
        />
      </aside>

      <main
        {...staff.dropTarget}
        onClick={e => { if (mode === 'manual' && !(e.target as Element).closest('figure, [data-add]')) staff.setSelected(null) }}
        className={`flex flex-1 flex-col bg-[#f5f5f5] px-2 py-6 pb-[140px] md:min-w-0 md:overflow-y-auto md:p-16
          ${mode === 'table' && staff.file && staff.dragging ? 'outline-2 -outline-offset-8 outline-dashed outline-black' : ''}`}
      >
        {mode === 'table' && !staff.file ? (
          <UploadArea staff={staff} />
        ) : (
        <div className="m-auto grid w-full grid-cols-1 gap-8">
          {/* The face, the same for everyone, once at the top whatever the file's page order («Обложка у всех» is the file's) */}
          <div className="flex justify-center">
            <div className={`w-full max-w-[480px] ${BESIDE} transition-opacity duration-150 ${mode === 'manual' && current ? 'opacity-40' : ''}`}>
              <div className="outline-1 outline-black/10"><CardArt text={face} /></div>
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
              <Fragment key={p.key}>
              <Removed staff={staff} at={i} />
              <figure ref={staff.figureRef(p.key)} onClick={() => staff.pick(p.key)} className="group/row flex cursor-pointer justify-center">
                <div className="flex w-full max-w-[480px] flex-col gap-3">
                  <ItemFrame staff={staff} item={p} n={i + 1}>
                  <button
                    type="button"
                    aria-pressed={mode === 'manual' ? active : undefined}
                    // Edged as every generator's items (`ITEM_EDGE`)
                    className={`block w-full cursor-pointer ${ITEM_EDGE} transition-opacity duration-150
                      ${dimmed ? 'opacity-40 group-hover/row:opacity-100' : ''}`}
                  >
                    <CardArt
                      text={card ? toD([...BACK_LOGO, ...card.back.qr, ...paths(f => !card.ghost.has(f) && !wrong.has(f))]) : undefined}
                      alert={card ? toD(paths(f => !card.ghost.has(f) && wrong.has(f))) : undefined}
                      ghost={card ? toD([...card.ghostQr, ...paths(f => card.ghost.has(f))]) : undefined}
                    />
                  </button>
                  </ItemFrame>
                  {problems[i].length > 0 && <p className={`text-[13px] leading-5 text-[#e30] ${BESIDE}`}>{alertLine(problems[i])}</p>}
                </div>
              </figure>
              </Fragment>
            )
          })}
          <Removed staff={staff} at={items.length} />
          {mode === 'manual' && <AddTile onClick={() => staff.add()} />}
        </div>
        )}
      </main>

    </div>
  )
}

/**
 * A card's errors in one line, as the name tag's: the empty fields in one phrase («Нет имени, фамилии, почты и
 * телефона»), then the rest
 */
function alertLine(problems: string[]): string {
  const all = Object.values(MISSING) as string[]
  const empty = all.filter(t => problems.includes(t)).map(t => t.replace(/^Нет /, ''))
  const missing = empty.length ? `Нет ${empty.length > 1 ? `${empty.slice(0, -1).join(', ')} и ${empty[empty.length - 1]}` : empty[0]}` : ''
  return [missing, ...problems.filter(t => !all.includes(t))].filter(Boolean).join(' · ')
}
