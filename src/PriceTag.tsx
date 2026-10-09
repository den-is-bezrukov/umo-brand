import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Field as Labelled, ComboField, TextArea, TextInput, GeneratorHeader, DownloadBar, unfilled, Segments, SegBtn, ALERT_LABEL } from '@/ui/form'
import { useStaff, TableSource, UploadArea, AddTile, inWork, ItemFrame, Removed, BESIDE, ITEM_EDGE } from '@/ui/staff'
import { goal } from '@/ui/metrika'
import { toD, type Cmd } from '@/livery/geometry'
import { loadFonts, type Fonts } from '@/nametag/tag'
import { xlsxCells, pastedCells, byHeaders, type Cells } from '@/nametag/table'
import { TAG, BAND, BAND_ART, DEFAULT_CAPTION, buildTag, formatPrice, readPrice, type Item, type TagField } from '@/pricetag/tag'
import { DEALER_NAMES, withoutUmo } from '@/data/dealers'

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
const UNFILLED: Partial<Record<TagField, string>> = { dealer: 'Дилер не выбран', name: 'Наименование не указано', caption: 'Подпись не указана', price: 'Цена не указана' }
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

/** The dealers as the band names them: without «UMO», as the logo stands right by the name */
const DEALER_OPTIONS = DEALER_NAMES.map(withoutUmo)

export default function PriceTag() {
  const staff = useStaff<Item>({
    blank: BLANK,
    readFile: data => toItems(xlsxCells(data)),
    readPasted: text => toItems(pastedCells(text)),
  })
  const { mode, setMode, current, update } = staff
  staff.useDeleteKey(false)

  const [dealer, setDealer] = useState('')
  const [fonts, setFonts] = useState<Fonts>()
  const [exporting, setExporting] = useState(false)
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
    const wrongPrice = it.price.trim() && !/^\d[\d ]*$/.test(it.price.trim()) ? [{ field: 'price' as const, text: 'Цена: проверьте число' }] : []
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

  const handleExport = async () => {
    if (!tags || !ok) return
    setExporting(true)
    try {
      const { tagsPdf } = await import('@/pricetag/pdf')
      const blob = await tagsPdf(tags.map(t => t.tag))
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'UMO_price-tags.pdf'
      a.click()
      goal('download_price_tag', { count: tags.length })
      URL.revokeObjectURL(a.href)
    } finally {
      setExporting(false)
    }
  }

  /** A tag's first fault: a wrong value said as it is, else its first empty field by name */
  const problemOf = (i: number) => ownIssues(i)[0]?.text ?? (missing[i].length ? unfilled(missing[i].map(f => UNFILLED[f]!), 0) : undefined)

  return (
    <div className="flex min-h-dvh flex-col bg-white font-sans text-black md:h-dvh md:flex-row">

      <aside className="relative flex shrink-0 flex-col md:h-full md:w-[321px] md:overflow-y-auto md:border-r md:border-black/10">
        <div className="flex flex-col gap-6 p-6 tracking-[-0.01em] md:pb-2">
          <GeneratorHeader current="/price-tag" />

          <Labelled label="Данные">
            <Segments>
              <SegBtn active={mode === 'manual'} onClick={() => setMode('manual')}>Вручную</SegBtn>
              <SegBtn active={mode === 'table'} onClick={() => setMode('table')}>Из таблицы</SegBtn>
            </Segments>
          </Labelled>

          <div className="flex flex-col gap-4 tracking-normal">
            {/* The dealer: the whole list's */}
            <div ref={dealerField} className="group/field flex flex-col gap-2">
              <p className={`text-[14px] leading-4 text-[#808080] ${ALERT_LABEL}`}>Дилер</p>
              <ComboField
                value={dealer}
                onChange={setDealer}
                options={DEALER_OPTIONS}
                singleLine
                placeholder="Название дилера"
                label="Дилеры UMO"
                invalid={dealerIssues.length > 0 && !dealerMissing}
              />
            </div>

            {mode === 'manual' && current && (() => {
              const it = current
              const i = items.findIndex(x => x.key === it.key)
              const issues = problems[i] ?? []
              const bad = (field: TagField, label: string) => issues.some(t => t.startsWith(label) || t === MISSING[field])
              return (
                <div ref={staff.form} onPasteCapture={e => staff.paste(it.key, e)} className="flex flex-col gap-4">
                  <Labelled label="Наименование">
                    <TextArea value={it.name} onChange={v => update(it.key, { name: v })} placeholder="Наименование товара" invalid={bad('name', 'Наименование')} />
                  </Labelled>
                  <Labelled label="Артикул">
                    <TextInput value={it.code} onChange={v => update(it.key, { code: v })} placeholder="CODE-12345" invalid={bad('code', 'Артикул')} />
                  </Labelled>
                  <Labelled label="Подпись">
                    <ComboField key={it.key} value={it.caption} onChange={v => update(it.key, { caption: v })} options={CAPTIONS} singleLine placeholder={DEFAULT_CAPTION} label="Подписи цены" invalid={bad('caption', 'Подпись')} />
                  </Labelled>
                  <Labelled label="Цена, ₽">
                    <TextInput numeric value={it.price} onChange={v => update(it.key, { price: formatPrice(v).slice(0, 11) })} placeholder="0 000" invalid={bad('price', 'Цена')} />
                  </Labelled>
                </div>
              )
            })()}

            {mode === 'table' && <TableSource staff={staff} template={TEMPLATE} />}
          </div>
        </div>

        {/* The dealer first, as every tag needs it; then the tags in work, as the name tag counts them */}
        <DownloadBar
          format="PDF"
          onClick={handleExport}
          busy={exporting}
          disabled={!ok}
          note={(dealerMissing ? unfilled([UNFILLED.dealer!, ...(items.length === 1 ? missing[0].map(f => UNFILLED[f]!) : [])], items.length === 1 ? 4 : 0) : dealerIssues[0]) ?? (!items.length ? 'Нет таблицы' : items.length > 1 ? inWork(failing.length, items.length) : problemOf(0))}
          onNote={dealerIssues.length ? toDealer : items.length ? () => staff.nextOf(failing) : undefined}
        />
      </aside>

      <main
        {...staff.dropTarget}
        onClick={e => { if (mode === 'manual' && !(e.target as Element).closest('figure, [data-add]')) staff.setSelected(null) }}
        className={`flex flex-1 flex-col bg-[#f5f5f5] px-2 py-6 pb-[88px] md:min-w-0 md:overflow-y-auto md:p-16
          ${mode === 'table' && staff.file && staff.dragging ? 'outline-2 -outline-offset-8 outline-dashed outline-black' : ''}`}
      >
        {mode === 'table' && !staff.file ? (
          <UploadArea staff={staff} />
        ) : (
        <div className="m-auto grid w-full grid-cols-1 gap-8">
          {items.map((it, i) => {
            const t = tags?.[i]
            const active = mode === 'manual' && it.key === current?.key
            const dimmed = mode === 'manual' && !!current && !active
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
