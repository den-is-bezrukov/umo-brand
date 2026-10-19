import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Field as Labelled, ComboField, TextArea, TextInput, GeneratorHeader, DownloadBar, LinkButtons, canShareFiles, unfilled, itemOf, Segments, SegBtn, ALERT_LABEL, outlined } from '@/ui/form'
import { useStaff, pickTable, TableSource, UploadArea, AddTile, ItemFrame, Removed, ItemAlert, ITEM_EDGE } from '@/ui/staff'
import { goal } from '@/ui/metrika'
import { toD, type Cmd } from '@/livery/geometry'
import { loadFonts, type Fonts } from '@/nametag/tag'
import { xlsxCells, pastedCells, byHeaders, type Cells } from '@/nametag/table'
import { TAG, BAND, BAND_ART, DEFAULT_CAPTION, buildTag, formatPrice, readPrice, PRICE_FORMAT, type Item, type TagField } from '@/pricetag/tag'
import { DEALER_NAMES, dealerFilter, withoutUmo } from '@/data/dealers'
import { readTagsFile } from '@/pricetag/read'
import { plural } from '@/ui/staff'
import { MobileEditor, usePhone } from '@/ui/mobile'
import { linkParams, saveAndOpenPdf } from '@/ui/share'

// Price tag generator (Figma: UMO | Evrone, node 4202:4368): price tags for the small goods at a dealership, any
// employee printing them on an office printer and cutting them out with scissors. The dealer is set once, the goods typed
// on the page or loaded from the template; one PDF out, eight tags to an A4 sheet. The list works as the name tag's and
// the business card's (`useStaff`).

const TEMPLATE = `${import.meta.env.BASE_URL}downloads/UMO_price-tags_template.xlsx`

const BLANK: Item = { name: '', code: '', caption: DEFAULT_CAPTION, price: '' }
/** Shown grey on the tag in place of an empty required field; never in the PDF */
const PLACEHOLDER: Partial<Record<TagField, string>> = { dealer: 'Название дилера', name: 'Наименование товара', caption: DEFAULT_CAPTION, price: '0 000' }
const MISSING: Partial<Record<TagField, string>> = { dealer: 'Нет названия дилера', name: 'Нет наименования', caption: 'Нет подписи', price: 'Нет цены' }
/** The first empty field, said by name over the download */
const UNFILLED: Partial<Record<TagField, string>> = { dealer: 'Выбрать дилера', name: 'Добавить наименование', caption: 'Добавить подпись', price: 'Указать цену' }
const REQUIRED = ['name', 'caption', 'price'] as const

const CAPTIONS = [DEFAULT_CAPTION, 'Цена за комплект с НДС', 'Цена за упаковку с НДС']

const HEADERS: Record<keyof Item, RegExp> = {
  name: /^(наименование|название|товар)/i,
  code: /^(артикул|код|sku)/i,
  price: /^(цена|стоимость)/i,
  caption: /^подпись/i,
}
/** A price as a table has it, a number or text, set in threes; left as it is if it isn't one, to be said wrong */
const toItems = (rows: Cells[]): Item[] => byHeaders(rows, HEADERS).map(r => ({
  ...r,
  caption: r.caption.trim() || DEFAULT_CAPTION,
  price: readPrice(r.price) ?? r.price,
}))

/** A link's caption: `set` and `pack` for the suggestions, else as written */
const LINK_CAPTIONS: Record<string, string> = { set: CAPTIONS[1], pack: CAPTIONS[2] }

/**
 * The dealer and goods a link brings (a link made for the dealer): `dealer`, then `n1`, `c1`, `p1`, `s1` (the
 * name, code, price, caption), `n2`… while there's a name. Read on load only, never written back: the list would make
 * the address huge
 */
function fromLink(): { dealer: string; items: Item[] } {
  const link = linkParams()
  const items: Item[] = []
  for (let i = 1; link.has(`n${i}`); i++) {
    const s = link.get(`s${i}`)?.trim() ?? ''
    const p = link.get(`p${i}`) ?? ''
    items.push({ name: link.get(`n${i}`) ?? '', code: link.get(`c${i}`) ?? '', caption: LINK_CAPTIONS[s] ?? (s || DEFAULT_CAPTION), price: readPrice(p) ?? p })
  }
  return { dealer: withoutUmo(link.get('dealer')?.trim() ?? ''), items }
}

/** The dealers as the band names them: without «UMO», as the logo stands right by the name */
const DEALER_OPTIONS = DEALER_NAMES.map(withoutUmo)

export default function PriceTag() {
  const [initial] = useState(fromLink)
  const [dealer, setDealer] = useState(initial.dealer)
  const staff = useStaff<Item>({
    columns: { name: 'Наименование', code: 'Артикул', price: 'Цена', caption: 'Подпись' },
    blank: BLANK,
    initial: initial.items,
    // The tags' own PDF (or Word file, while its download is off still read when dropped) brings its dealer and goods
    // back, to fix a price and download again; else a table
    readFile: data => {
      const own = readTagsFile(data)
      if (!own) return toItems(xlsxCells(data))
      if (own.dealer) setDealer(own.dealer)
      return own.items
    },
    readPasted: text => toItems(pastedCells(text)),
    accept: '.xlsx,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf',
    uploadLabel: 'Загрузить таблицу или PDF',
    countWord: n => `${n} ценник` + ({ '': '', 'а': 'а', 'ей': 'ов' } as Record<string, string>)[plural(n)],
  })
  const { mode, setMode, current, update } = staff
  staff.useKeys(false)

  const [fonts, setFonts] = useState<Fonts>()
  const [exporting, setExporting] = useState(false)
  const phone = usePhone()
  useEffect(() => { loadFonts().then(setFonts) }, [])

  useEffect(() => {
    const prev = document.title
    document.title = 'Ценник UMO'
    return () => { document.title = prev }
  }, [])

  const items = staff.items
  /** Each tag as built, with the placeholders standing in for empty required fields */
  const tags = useMemo(() => fonts ? items.map(it => {
    const ghost = new Set<TagField>()
    const or = (field: TagField, v: string) => {
      if (v.trim()) return v
      ghost.add(field)
      return PLACEHOLDER[field]!
    }
    const tag = buildTag(fonts, or('dealer', dealer), { name: or('name', it.name), code: it.code, caption: or('caption', it.caption), price: or('price', it.price) })
    const wrongPrice = it.price.trim() && !PRICE_FORMAT.test(it.price.trim())
      // A table's price over the largest, else one that isn't a number
      ? [{ field: 'price' as const, text: it.price.split(/[,.]/)[0].replace(/\D/g, '').length > 7 ? 'Цена больше 9 999 999,99' : 'Цена: проверьте число' }]
      : []
    return { tag, ghost, issues: [...tag.issues.filter(i => !ghost.has(i.field)), ...wrongPrice] }
  }) : undefined, [fonts, items, dealer])

  const dealerMissing = !dealer.trim()
  const dealerIssues = [...(dealerMissing ? [MISSING.dealer!] : []), ...new Set(tags?.[0]?.issues.filter(i => i.field === 'dealer').map(i => i.text) ?? [])]

  const missing = items.map(it => REQUIRED.filter(f => !it[f].trim()))
  const ownIssues = (i: number) => tags?.[i]?.issues.filter(x => x.field !== 'dealer') ?? []
  const problems = items.map((it, i) => [...new Set([
    ...(staff.showsMissing(it.key) ? missing[i].map(f => MISSING[f]!) : []),
    ...ownIssues(i).map(x => x.text),
  ])])
  const failing = items.filter((_, i) => missing[i].length || ownIssues(i).length).map(it => it.key)
  const ok = !!tags && items.length > 0 && failing.length === 0 && dealerIssues.length === 0

  const dealerField = useRef<HTMLDivElement>(null)
  const toDealer = () => dealerField.current?.querySelector<HTMLElement>('textarea, input')?.focus()

  /** The PDF, or the same tags as a Word document from the brand team's template, for those who print from Word */
  const [exportingWord, setExportingWord] = useState(false)
  const save = (blob: Blob, name: string) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
  }
  /** The tags' PDF for «Поделиться» to send, made again as they change */
  const shareFile = useCallback(async () => {
    const { tagsPdf, TAGS_FILE } = await import('@/pricetag/pdf')
    return new File([await tagsPdf(tags!.map(t => t.tag), { dealer, items: items.map(({ key: _, ...it }) => it) })], TAGS_FILE, { type: 'application/pdf' })
  }, [tags, dealer, items]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = async () => {
    if (!tags || !ok) return
    setExporting(true)
    try {
      const { tagsPdf, TAGS_FILE } = await import('@/pricetag/pdf')
      save(await tagsPdf(tags.map(t => t.tag), { dealer, items: items.map(({ key: _, ...it }) => it) }), TAGS_FILE)
      goal('download_price_tag', { count: tags.length, format: 'pdf' })
    } finally {
      setExporting(false)
    }
  }

  // `pdf` in the link opens the tags' PDF itself, with no editor, once the fonts are in; a tag at fault opens the editor
  // instead, showing what's wrong
  const [pdfOnly, setPdfOnly] = useState(() => linkParams().has('pdf') && initial.items.length > 0)
  const pdfStarted = useRef(false)
  useEffect(() => {
    if (!pdfOnly || !tags || pdfStarted.current) return
    pdfStarted.current = true
    if (!ok) { setPdfOnly(false); return }
    import('@/pricetag/pdf')
      .then(async ({ tagsPdf, TAGS_FILE }) => {
        const blob = await tagsPdf(tags.map(t => t.tag), { dealer, items: items.map(({ key: _, ...it }) => it) })
        goal('download_price_tag', { count: tags.length, format: 'pdf', via: 'link' })
        saveAndOpenPdf(blob, TAGS_FILE)
      })
      .catch(() => setPdfOnly(false))
  }, [tags]) // eslint-disable-line react-hooks/exhaustive-deps
  const handleWord = async () => {
    if (!ok) return
    setExportingWord(true)
    try {
      const { tagsDocx } = await import('@/pricetag/docx')
      save(await tagsDocx(dealer, items.map(({ key: _, ...it }) => it)), 'UMO_price-tags.docx')
      goal('download_price_tag', { count: items.length, format: 'docx' })
    } finally {
      setExportingWord(false)
    }
  }

  /** A tag's first fault: a wrong value said as it is, else its first empty field by name */
  const problemOf = (i: number) => ownIssues(i)[0]?.text ?? (missing[i].length ? unfilled(missing[i].map(f => UNFILLED[f]!)) : undefined)

  const renderItem = (it: typeof items[number], i: number) => {
            const t = tags?.[i]
            const active = mode === 'manual' && it.key === current?.key
            const dimmed = mode === 'manual' && !!current && !active && !phone
            const wrong = new Set<TagField>([...(dealerIssues.length && !dealerMissing ? ['dealer' as const] : []), ...(t?.issues.map(x => x.field) ?? [])])
            const paths = (only: (f: TagField) => boolean) => t
              ? (Object.entries(t.tag.fields) as [TagField, Cmd[]][]).filter(([f]) => only(f)).flatMap(([, c]) => c)
              : []
            const band = (f: TagField) => f === 'dealer'
            return (
              <Fragment key={it.key}>
              <Removed staff={staff} at={i} />
              <figure ref={staff.figureRef(it.key)} onClick={() => staff.pick(it.key)} className="group/row flex cursor-pointer justify-center">
                <div className="flex w-full max-w-[480px] flex-col gap-3">
                  <ItemFrame staff={staff} item={it} n={i + 1}>
                  <button
                    type="button"
                    aria-pressed={mode === 'manual' ? active : undefined}
                    className={`block w-full cursor-pointer ${ITEM_EDGE} transition-opacity duration-150
                      ${dimmed ? 'opacity-40 group-hover/row:opacity-100' : ''}`}
                  >
                    <TagArt
                      white={t ? toD([...BAND_ART, ...paths(f => band(f) && !t.ghost.has(f) && !wrong.has(f))]) : toD(BAND_ART)}
                      text={t ? toD(paths(f => !band(f) && !t.ghost.has(f) && !wrong.has(f))) : undefined}
                      alert={t ? toD(paths(f => !t.ghost.has(f) && wrong.has(f))) : undefined}
                      ghost={t ? toD(paths(f => t.ghost.has(f))) : undefined}
                    />
                  </button>
                  </ItemFrame>
                  {problems[i].length > 0 && <ItemAlert staff={staff} item={it.key}>{alertLine(problems[i])}</ItemAlert>}
                </div>
              </figure>
              </Fragment>
            )
          }

  const sidebar = (
    <>
        <div className="flex flex-col gap-6 p-6 tracking-[-0.01em] md:pb-2">
          <GeneratorHeader current="/price-tag" />

          {/* The form under the header in one rhythm, 16 px apart as any fields (the list's «Данные» stood 24 off the person's fields) */}
          <div className="flex flex-col gap-4">
          {/* The dealer first: the whole list's, set once */}
          <div ref={dealerField} className="group/field flex flex-col gap-3 tracking-normal">
            <p className={`text-[14px] leading-4 text-[#808080] ${ALERT_LABEL}`}>Дилер</p>
            <ComboField
              value={dealer}
              onChange={setDealer}
              options={DEALER_OPTIONS} filter={dealerFilter}
              singleLine
              placeholder="Название дилера"
              label="Дилеры UMO"
              invalid={dealerIssues.length > 0 && !dealerMissing}
            />
          </div>

          <Labelled label="Данные">
            {/* The table mode's template (then its file) right under the switch, 8 px off it, as a pair: the mode's first step */}
            <div className="flex flex-col gap-2">
              <Segments>
                <SegBtn active={mode === 'manual'} onClick={() => setMode('manual')}>Вручную</SegBtn>
                <SegBtn active={mode === 'table'} onClick={() => setMode('table')}>Из таблицы</SegBtn>
              </Segments>
              {mode === 'table' && <TableSource staff={staff} template={TEMPLATE} />}
            </div>
          </Labelled>

          <div className="flex flex-col gap-4 tracking-normal">
            {mode === 'manual' && current && (() => {
              const it = current
              const i = items.findIndex(x => x.key === it.key)
              const issues = problems[i] ?? []
              const bad = (field: TagField, label: string) => issues.some(t => t.startsWith(label) || t === MISSING[field])
              return (
                <div ref={staff.form} onPasteCapture={e => staff.paste(it.key, e)} className="@container flex flex-col gap-4">
                  <Labelled label="Наименование">
                    <TextArea value={it.name} onChange={v => update(it.key, { name: v })} placeholder="Наименование товара" invalid={bad('name', 'Наименование')} />
                  </Labelled>
                  <Labelled label="Артикул">
                    <TextInput value={it.code} onChange={v => update(it.key, { code: v })} placeholder="CODE-12345" invalid={bad('code', 'Артикул')} />
                  </Labelled>
                  {/* The caption and the price share a row where the form is wide enough for the caption to show whole (a phone held
                      sideways), one under the other otherwise; a longer caption is cut to one line */}
                  <div className="grid gap-x-3 gap-y-4 @min-[400px]:grid-cols-2">
                  <Labelled label="Подпись">
                    <ComboField key={it.key} value={it.caption} onChange={v => update(it.key, { caption: v })} options={CAPTIONS} singleLine placeholder={DEFAULT_CAPTION} label="Подписи цены" truncate invalid={bad('caption', 'Подпись')} />
                  </Labelled>
                  <Labelled label="Цена, ₽">
                    <PriceField value={it.price} onChange={v => update(it.key, { price: v })} invalid={bad('price', 'Цена')} />
                  </Labelled>
                  </div>
                </div>
              )
            })()}

          </div>
          </div>
        </div>

        {/* The dealer first, as every tag needs it; then the tags in work, as the name tag counts them */}
    </>
  )

  const download = (
        <DownloadBar
          format="PDF"
          onClick={handleExport}
          busy={exporting}
          disabled={!ok}
          note={(dealerMissing ? unfilled([UNFILLED.dealer!, ...(items.length === 1 ? missing[0].map(f => UNFILLED[f]!) : [])]) : dealerIssues[0]) ?? (!items.length ? 'Загрузить таблицу' : problemOf(failing.length ? staff.inWork(failing).index : 0))}
          count={!dealerIssues.length && failing.length ? itemOf(staff.inWork(failing).index, items.length) : undefined}
          onNote={dealerIssues.length ? toDealer : items.length ? () => staff.nextOf(failing) : pickTable}
          links={canShareFiles && <LinkButtons incomplete={!ok} file={shareFile} fileOnly />}
          // The Word file is off for now: CoFo Sans shows only in Word for Windows, elsewhere it's swapped for Arial, and the
          // layout breaks easily there; fixing a price is done by dropping the PDF back. To bring it back, uncomment:
          // links={ (with «Поделиться» above, in a fragment)
          //   <button type="button" onClick={handleWord} disabled={!ok || exportingWord} className={`${outlined} w-full bg-white`}>
          //     {exportingWord ? 'Генерация…' : 'Скачать Word'}
          //   </button>
          // }
        />
  )

  // Phones: the canvas over a sheet with the form (trial, Figma 5098:5806)
  if (pdfOnly) return null
  if (phone) return <MobileEditor slides={mode === 'table' && !staff.file ? [{ key: 'upload', node: <UploadArea staff={staff} /> }] : items.map((it, i) => ({ key: it.key, item: it.key, label: it.name.replace(/\s+/g, ' ').trim(), ratio: TAG.h / TAG.w, node: renderItem(it, i) }))} sidebar={sidebar} download={download} staff={staff} />

  return (
    <div className="flex min-h-dvh flex-col bg-white font-sans text-black md:h-dvh md:flex-row">

      <aside className="relative flex shrink-0 flex-col md:h-full md:w-[321px] md:overflow-y-auto md:border-r md:border-black/10">
        {sidebar}
        {download}
      </aside>

      <main
        {...staff.dropTarget}
        onClick={e => { if (mode === 'manual' && !(e.target as Element).closest('figure, [data-add], [data-template]')) staff.setSelected(null) }}
        className={`flex flex-1 flex-col bg-[#f5f5f5] px-2 py-6 pb-[88px] md:min-w-0 md:overflow-y-auto md:p-16
          ${mode === 'table' && staff.file && staff.dragging ? 'outline-2 -outline-offset-8 outline-dashed outline-black' : ''}`}
      >
        {mode === 'table' && !staff.file ? (
          <UploadArea staff={staff} />
        ) : (
        <div className="m-auto grid w-full grid-cols-1 gap-8">
          {items.map(renderItem)}
          <Removed staff={staff} at={items.length} />
          {mode === 'manual' && <AddTile onClick={() => staff.add()} />}
        </div>
        )}
      </main>

    </div>
  )
}

/**
 * The price, one field with the kopecks it doesn't have yet shown after it in grey: «1 290» reads «1 290,00», «1 290,5»
 * reads «1 290,50», so it's plain there are kopecks without typing them (a field of two parts, roubles and kopecks, as
 * the business card's phone, was tried). The grey tail is a copy of the text laid under the field, transparent but for
 * the tail, in the same type and padding
 */
function PriceField({ value, onChange, invalid }: { value: string; onChange: (v: string) => void; invalid?: boolean }) {
  const kopecks = value.split(',')[1]
  const tail = !value ? '' : kopecks === undefined ? ',00' : '00'.slice(kopecks.length)
  return (
    <div className="relative rounded-[8px] bg-[#f5f5f5]">
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center overflow-hidden px-3 text-[14px] leading-5 whitespace-pre">
        <span className="invisible">{value}</span>
        <span className="text-[#999]">{tail}</span>
      </div>
      <TextInput value={value} onChange={v => onChange(formatPrice(v))} placeholder="0 000,00" inputMode="decimal" invalid={invalid} className="relative bg-transparent!" />
    </div>
  )
}

/**
 * A tag in the preview, in its millimetres: the black band and white tag, `white` on the band, `text` black, `alert`
 * (the fields at fault) red, `ghost` (placeholders of empty fields) grey. Every path is even-odd, as in the PDF
 */
function TagArt({ white, text, alert, ghost }: { white?: string; text?: string; alert?: string; ghost?: string }) {
  return (
    <svg viewBox={`0 0 ${TAG.w} ${TAG.h}`} className="block w-full" role="img">
      <rect width={TAG.w} height={TAG.h} fill="#ffffff" />
      <rect width={TAG.w} height={BAND} fill="#000000" />
      {ghost && <path d={ghost} fill="#a6a6a6" fillRule="evenodd" />}
      {white && <path d={white} fill="#ffffff" fillRule="evenodd" />}
      {text && <path d={text} fill="#000000" fillRule="evenodd" />}
      {alert && <path d={alert} fill="#e30" fillRule="evenodd" />}
    </svg>
  )
}

/** A tag's errors in one line, as the name tag's: the empty fields in one phrase, then the rest */
function alertLine(problems: string[]): string {
  const all = Object.values(MISSING) as string[]
  const empty = all.filter(t => problems.includes(t)).map(t => t.replace(/^Нет /, ''))
  const missing = empty.length ? `Нет ${empty.length > 1 ? `${empty.slice(0, -1).join(', ')} и ${empty[empty.length - 1]}` : empty[0]}` : ''
  return [missing, ...problems.filter(t => !all.includes(t))].filter(Boolean).join(' · ')
}
