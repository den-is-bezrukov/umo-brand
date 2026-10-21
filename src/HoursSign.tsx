import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Font } from 'opentype.js'
import { goal } from '@/ui/metrika'
import { Field, TextInput, ComboField, GeneratorHeader, LinkButtons, DownloadBar, flash } from '@/ui/form'
import { isPdf, readPdfData } from '@/ui/pdfData'
import { CaptionReset } from '@/ui/staff'
import { linkParams, useLinkState, saveAndOpenPdf } from '@/ui/share'
import { toD } from '@/livery/geometry'
import { maskPhone, siteFor } from '@/card/card'
import { SIGN, SIGN_KEY, LOGO, buildSign, timeText, type SignField, type Input } from '@/hours/sign'
import { loadFont, oneLine } from '@/ui/type'
import { DEALER_NAMES, dealerFilter, withoutBrand, phoneOf } from '@/data/points'
import { DEFAULT_HOURS_LINE, addressOf, hoursOf } from '@/data/hours'
import { MobileEditor, usePhone } from '@/ui/mobile'
import { recordText } from '@/ui/liveText'
import { TemplateButton, useTemplateLink } from '@/ui/template'
import { SITE } from '@/site'

// The dealership's hours sign: a 480×680 mm plate with the logo, the hours, a
// line under them and the dealership at the bottom, as a PDF in outlines for the maker. A dealer picked from the list
// puts in its address and hours from the brand's site and its site, all of them edited freely; the phone from the hand-kept list.

/** The dealers' names without the brand's name, which the sign puts before them, fixed */
const NAMES = DEALER_NAMES.map(withoutBrand)

/** Empty fields stand grey on the sign as these; never in the PDF */
const PLACEHOLDER: Record<Exclude<SignField, 'line'>, string> = {
  from: '9:00', to: '21:00', dealer: 'Название дилера', address: 'Адрес', phone: '+7 495 000 00 00', site: 'Сайт',
}
/** What an empty field asks for in the download button, in the form's order */
const MISSING: Record<Exclude<SignField, 'line'>, string> = {
  from: 'Указать время', to: 'Указать время', dealer: 'Выбрать дилера', address: 'Указать адрес', phone: 'Указать телефон', site: 'Указать сайт',
}
const ORDER = ['from', 'to', 'dealer', 'address', 'phone', 'site'] as const

/** The hours step by half an hour, from 0:00 to 24:00 */
const STEP = 30
const DAY = 24 * 60
/** A day shorter than this is said under the sign */
const SHORT_DAY = 8 * 60
const minutesOf = (t: string) => { const [h, m] = t.split(':'); return +h * 60 + +m }
const timeOf = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`
/** A typed time made whole, taken to the nearest half hour («9:57» → «10:00») and into [min, max] */
const rounded = (raw: string, min = 0, max = DAY) => {
  const t = timeText(wholeTime(raw))
  return t ? timeOf(Math.max(min, Math.min(max, Math.round(minutesOf(t) / STEP) * STEP))) : raw
}

/**
 * The time field's mask, as it's typed: the hours, then the minutes after a colon, never a time that can't be. The
 * hours take one digit from 3 on, two up to 24, else the next digit starts the minutes; the minutes' first digit is
 * 0–5 (only 0 after 24), others are dropped: «666» → «6», «930» → «9:30», «25» → «2:5». The colon goes in with
 * the minutes or when typed; until then the field shows it grey (`tail`)
 */
function maskTime(raw: string): string {
  let hour = ''
  let min = ''
  let colon = false
  for (const c of raw.replace(/\./g, ':')) {
    if (c === ':') { if (hour) colon = true; continue }
    if (!/\d/.test(c)) continue
    const d = +c
    if (!colon && !hour) { hour = c; continue }
    if (!colon && hour.length === 1 && +hour < 3 && +(hour + c) <= 24) { hour += c; continue }
    colon = true
    if (!min && (d <= 5 && (+hour < 24 || d === 0))) min = c
    else if (min.length === 1 && (+hour < 24 || d === 0)) min += c
  }
  return hour + (colon && (min || /:/.test(raw)) ? `:${min}` : '')
}

/** What's left of «9:00» after what's typed, shown grey after it: «6» → «:00», «6:3» → «0» */
const tailOf = (v: string) => v.includes(':') ? '00'.slice(v.split(':')[1].length) : ':00'

/** A masked time made whole, as the sign shows it while it's typed: «6» → «6:00», «6:3» → «6:30» */
const wholeTime = (v: string) => v ? v + tailOf(v) : v

function StepIcon({ plus }: { plus?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden>
      <path d="M3 8h10" />
      {plus && <path d="M8 3v10" />}
    </svg>
  )
}

/**
 * A time with steppers either side, half an hour a click (or ↑ ↓), from what's there or the placeholder; typed by
 * hand too, and rounded to the half hour when the field is left, so 9:57 can't stand on the sign
 */
function TimeField({ value, onChange, onCommit, placeholder, invalid, label, min, max }: {
  value: string
  /** Each key typed */
  onChange: (v: string) => void
  /** A step, or the typed time made whole when the field is left: where the other time may be pushed */
  onCommit: (v: string) => void
  placeholder: string
  invalid?: boolean
  label: string
  /** Minutes it can't go under or over: half an hour off the day's ends, leaving room for the other time */
  min: number
  max: number
}) {
  const step = (dir: 1 | -1) => {
    const t = timeText(value) ?? placeholder
    const now = minutesOf(t)
    // From a time off the grid, the first step lands on it
    const next = dir > 0 ? Math.floor(now / STEP) * STEP + STEP : Math.ceil(now / STEP) * STEP - STEP
    onCommit(timeOf(Math.max(min, Math.min(max, next))))
  }
  const button = 'flex w-9 shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-caption hover:text-black'
  return (
    <div className="flex h-10 in-[[data-sheet]]:h-12! rounded-[8px] bg-surface focus-within:ring-1 focus-within:ring-inset focus-within:ring-black/40">
      <button type="button" tabIndex={-1} onClick={() => step(-1)} aria-label={`${label}: на полчаса раньше`} className={button}><StepIcon /></button>
      {/* The typed time over a copy of it with the rest of «9:00» grey after it, so the colon always shows: the copy
          sizes the box, centred, and the input lies over it */}
      <label className="flex min-w-0 flex-1 cursor-text items-center justify-center text-[14px] leading-5 [font-variant-numeric:lining-nums_tabular-nums]">
        <span className="relative whitespace-pre">
          <span aria-hidden className="text-transparent">{value}</span>
          <span aria-hidden className="text-[#999]">{value ? tailOf(value) : placeholder}</span>
          <input
        value={value}
        onChange={e => onChange(maskTime(e.target.value))}
        onBlur={() => onCommit(rounded(value, min, max))}
        onKeyDown={e => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); step(e.key === 'ArrowUp' ? 1 : -1) }
          if (e.key === 'Enter') onCommit(rounded(value, min, max))
        }}
        inputMode="decimal"
        aria-label={label}
        aria-invalid={invalid || undefined}
        className="absolute inset-y-0 left-0 w-[calc(100%+2px)] bg-transparent p-0 text-black outline-none"
      />
        </span>
      </label>
      <button type="button" tabIndex={-1} onClick={() => step(1)} aria-label={`${label}: на полчаса позже`} className={button}><StepIcon plus /></button>
    </div>
  )
}

const GHOST = '#a6a6a6'
const ALERT = '#e30'

export default function HoursSign() {
  const [link] = useState(linkParams)
  // A listed dealer's hours from the brand's site stand in for the times a link leaves out, as its address does
  const [from, setFrom] = useState(() => maskTime(link.get('from') ?? hoursOf(link.get('name') ?? '')?.from ?? ''))
  const [to, setTo] = useState(() => maskTime(link.get('to') ?? hoursOf(link.get('name') ?? '')?.to ?? ''))
  // The line under the hours is fixed, «Работаем без выходных»: nothing a dealer needs to change there
  const line = DEFAULT_HOURS_LINE
  // A name with the brand's name (a link made by hand) loses it, as the sign puts it before the name; a phone takes the field's mask
  const [dealer, setDealer] = useState(() => withoutBrand(link.get('name') ?? ''))
  const [address, setAddress] = useState(() => link.get('address') ?? addressOf(link.get('name') ?? '') ?? '')
  const [phone, setPhone] = useState(() => maskPhone(link.get('phone') ?? phoneOf(link.get('name') ?? '') ?? '').text)
  /** A dealer's phone as the field writes it */
  const dealerPhone = (name: string) => { const p = phoneOf(name); return p ? maskPhone(p).text : undefined }
  /** The site follows the dealer's name (`siteFor`) until it's edited: null */
  const [ownSite, setSite] = useState<string | null>(link.get('site'))
  const site = ownSite ?? siteFor(dealer)
  useLinkState({
    from, to,
    name: dealer,
    address: address === addressOf(dealer) ? null : address,
    phone: phone === dealerPhone(dealer) ? null : phone,
    site: ownSite,
  })

  const [font, setFont] = useState<Font>()
  const [exporting, setExporting] = useState(false)
  const onPhone = usePhone()
  useEffect(() => { loadFont().then(setFont) }, [])

  useEffect(() => {
    const prev = document.title
    document.title = `Режимник ${SITE.name}`
    return () => { document.title = prev }
  }, [])

  const values: Record<Exclude<SignField, 'line'>, string> = { from: wholeTime(from), to: wholeTime(to), dealer, address, phone, site }
  const empty = ORDER.filter(f => !oneLine(values[f]))
  const shown: Input = { line, ...Object.fromEntries(ORDER.map(f => [f, oneLine(values[f]) ? values[f] : PLACEHOLDER[f]])) as Omit<Input, 'line'> }
  // Its lines noted too, for the editable template
  const built = useMemo(() => font ? recordText(() => buildSign(font, shown)) : undefined, [font, JSON.stringify(shown)]) // eslint-disable-line react-hooks/exhaustive-deps
  const sign = built?.result
  /** Faults of what's typed; a placeholder is never one */
  const issues = (sign?.issues ?? []).filter(i => !empty.includes(i.field as typeof ORDER[number]))
  const wrong = new Set(issues.map(i => i.field))
  const ok = !!sign && !empty.length && !issues.length

  // The first thing to do, in the form's order: an empty field or a wrong one
  const firstEmpty = empty[0]
  const firstWrong = ORDER.find(f => wrong.has(f)) ?? (wrong.has('line') ? 'line' : undefined)
  const firstAt = firstEmpty && (!firstWrong || ORDER.indexOf(firstEmpty) <= ORDER.indexOf(firstWrong as typeof ORDER[number])) ? firstEmpty : firstWrong
  const note = !firstAt ? undefined
    : firstAt === firstEmpty ? MISSING[firstAt]
      : issues.find(i => i.field === firstAt)!.text

  const form = useRef<HTMLDivElement>(null)
  const toField = () => form.current?.querySelector<HTMLElement>(`[data-field="${firstAt}"] input, [data-field="${firstAt}"] textarea`)?.focus()

  const pickDealer = (v: string) => {
    // The address, phone and hours follow the dealer picked while they're empty or the previous dealer's
    const a = addressOf(v)
    if (a && (!address.trim() || address === addressOf(dealer))) setAddress(a)
    const p = dealerPhone(v)
    if (p && (!phone.trim() || phone === dealerPhone(dealer))) setPhone(p)
    const h = hoursOf(v)
    const was = hoursOf(dealer)
    if (h && ((!from.trim() && !to.trim()) || (was && from === was.from && to === was.to))) { setFrom(h.from); setTo(h.to) }
    setDealer(v)
  }

  const blank = !ORDER.some(f => f !== 'site' && oneLine(values[f])) && ownSite === null
  const reset = () => {
    setFrom(''); setTo(''); setDealer(''); setAddress(''); setPhone(''); setSite(null)
  }

  const pdfOf = async (s: NonNullable<typeof sign>) => {
    const { signPdf, SIGN_FILE } = await import('@/hours/pdf')
    return { blob: await signPdf(s, { from, to, dealer, address, phone, site: ownSite }), name: SIGN_FILE }
  }
  /** The sign's PDF for «Поделиться» to send, made again as it changes */
  const shareFile = useCallback(async () => {
    const { blob, name } = await pdfOf(sign!)
    return new File([blob], name, { type: 'application/pdf' })
  }, [sign, from, to, dealer, address, phone, ownSite]) // eslint-disable-line react-hooks/exhaustive-deps
  const downloadGoal = (extra?: Record<string, unknown>) =>
    goal('download_hours_sign', { from: oneLine(from), to: oneLine(to), dealer: NAMES.includes(oneLine(dealer)), ...extra })

  const handleExport = async () => {
    if (!sign || !ok) return
    setExporting(true)
    try {
      const { blob, name } = await pdfOf(sign)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = name
      a.click()
      downloadGoal()
      URL.revokeObjectURL(a.href)
    } finally {
      setExporting(false)
    }
  }

  /** The editable template: the sign as on the page, placeholders where nothing is typed */
  const makeTemplate = built ? () => import('@/hours/pdf').then(m => m.signTemplate(built.result, built.lines)) : undefined
  /** The blank one a `template` link gives: every field its placeholder, the line under the hours as by default */
  const makeBlank = font ? () => {
    const one = recordText(() => buildSign(font, { line: DEFAULT_HOURS_LINE, ...PLACEHOLDER }))
    return import('@/hours/pdf').then(m => m.signTemplate(one.result, one.lines))
  } : undefined
  const templateOnly = useTemplateLink(makeBlank, `${SITE.file}_hours-sign_template.pdf`, 'download_hours_sign_template')

  // `pdf` in the link (a link made for the dealer) opens the sign's PDF itself, with no editor, once the font
  // is in; a sign at fault opens the editor instead, showing what's wrong
  const [pdfOnly, setPdfOnly] = useState(() => link.has('pdf'))
  const pdfStarted = useRef(false)
  useEffect(() => {
    if (!pdfOnly || !sign || pdfStarted.current) return
    pdfStarted.current = true
    if (!ok) { setPdfOnly(false); return }
    pdfOf(sign)
      .then(({ blob, name }) => { downloadGoal({ via: 'link' }); saveAndOpenPdf(blob, name) })
      .catch(() => setPdfOnly(false))
  }, [sign]) // eslint-disable-line react-hooks/exhaustive-deps

  // Each time pushes the other along when it's stepped or typed past it, half an hour apart: 10:30—11:00 with the
  // closing stepped down is 10:00—10:30, with the opening stepped up 11:00—11:30. Only a time filled in is pushed
  const commitFrom = (v: string) => {
    setFrom(v)
    const a = timeText(v)
    const b = timeText(wholeTime(to))
    if (a && b && minutesOf(b) < minutesOf(a) + STEP) setTo(timeOf(minutesOf(a) + STEP))
  }
  const commitTo = (v: string) => {
    setTo(v)
    const b = timeText(v)
    const a = timeText(wholeTime(from))
    if (a && b && minutesOf(a) > minutesOf(b) - STEP) setFrom(timeOf(minutesOf(b) - STEP))
  }

  /** Its own PDF dropped on the page opens what it was made from; any other file is said to have no sign */
  const openFile = async (file: File) => {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const d = isPdf(bytes) ? readPdfData(bytes, SIGN_KEY) as Partial<Record<'from' | 'to' | 'dealer' | 'address' | 'phone' | 'site', string | null>> | undefined : undefined
    if (!d || typeof d !== 'object') { flash('В файле нет режимника'); return }
    const text = (v: unknown) => typeof v === 'string' ? v : ''
    setFrom(maskTime(text(d.from))); setTo(maskTime(text(d.to))); setDealer(text(d.dealer)); setAddress(text(d.address)); setPhone(text(d.phone))
    setSite(typeof d.site === 'string' ? d.site : null)
  }

  /** A day under 8 hours, the shortest any dealer works (10:00–18:00): likely a typo, said under the sign */
  const short = !empty.includes('from') && !empty.includes('to') && !!timeText(values.from) && !!timeText(values.to)
    && minutesOf(timeText(values.to)!) - minutesOf(timeText(values.from)!) < SHORT_DAY

  const fill = (field: SignField | 'fixed') =>
    field === 'fixed' ? '#000' : wrong.has(field) ? ALERT : field !== 'line' && empty.includes(field) ? GHOST : '#000'
  const byFill = new Map<string, string>()
  for (const p of sign?.parts ?? []) byFill.set(fill(p.field), (byFill.get(fill(p.field)) ?? '') + toD(p.cmds))

  const preview = (
    <>
        <figure className="flex w-full flex-col items-center gap-2">
          {/* As tall as the canvas allows on wide screens, as wide as it on phones; on wide screens its width is the
              smaller of the canvas's and the one the height allows (12/17 of it, 480 × 680), so a narrow canvas shrinks
              the sign whole: a fixed height with the width capped stretched its white box past 480 × 680 */}
          <svg viewBox={`0 0 ${SIGN.w} ${SIGN.h}`} className="block h-auto w-full max-w-[480px] bg-white md:w-[min(100%,calc((100dvh-128px-30px)*12/17))] md:max-w-none" role="img" aria-label="Режимник">
            <path d={toD(LOGO)} fill="#000" fillRule="evenodd" />
            {[...byFill].map(([color, d]) => <path key={color} d={d} fill={color} />)}
          </svg>
          <figcaption className="mt-0.5 text-center text-[14px] leading-5 text-caption">
            <span className="relative">
              Табличка, {SIGN.w}&nbsp;×&nbsp;{SIGN.h}&nbsp;мм
              <CaptionReset onClick={blank ? undefined : reset} label="Вернуть табличку по умолчанию" extra={<TemplateButton make={makeTemplate} name={`${SITE.file}_hours-sign_template.pdf`} goalId="download_hours_sign_template" />} />
            </span>
          </figcaption>
          {/* A warning in red, as the generators' faults under their pictures, but the download stays on, as a short day can be meant (a holiday) */}
          {short && <p className="text-center text-[14px] leading-5 text-[#e30]">День короче 8&nbsp;часов&nbsp;— проверьте время</p>}
        </figure>
    </>
  )

  const sidebar = (
    <>
        <div className="flex flex-col gap-6 p-6 tracking-[-0.01em] md:pb-2">
          <GeneratorHeader current="/hours-sign" />

          <div ref={form} className="flex flex-col gap-4 tracking-normal">
            <Field label="Часы работы">
              <div className="grid grid-cols-2 gap-2 [font-variant-numeric:lining-nums_tabular-nums]">
                <div data-field="from"><TimeField value={from} onChange={setFrom} onCommit={commitFrom} placeholder={PLACEHOLDER.from} label="Открытие" invalid={wrong.has('from')} min={0} max={DAY - STEP} /></div>
                <div data-field="to"><TimeField value={to} onChange={setTo} onCommit={commitTo} placeholder={PLACEHOLDER.to} label="Закрытие" invalid={wrong.has('to')} min={STEP} max={DAY} /></div>
              </div>
            </Field>
            <Field label="Дилер">
              <div data-field="dealer"><ComboField value={dealer} onChange={pickDealer} options={NAMES} filter={dealerFilter} placeholder={PLACEHOLDER.dealer} label={`Дилеры ${SITE.name}`} singleLine invalid={wrong.has('dealer')} /></div>
            </Field>
            <Field label="Адрес">
              {/* A plain field, as the business card's: the dealer's address put in as it's picked, edited by hand (a list of
                  every dealer's address let a picked dealer take another's) */}
              <div data-field="address"><TextInput value={address} onChange={setAddress} placeholder={PLACEHOLDER.address} invalid={wrong.has('address')} /></div>
            </Field>
            <Field label="Телефон">
              {/* A live mask, as the business card's: set as the sign sets it while it's typed, the caret after the same digit */}
              <div data-field="phone">
                <TextInput
                  value={phone}
                  onChange={v => {
                    const el = document.activeElement as HTMLInputElement
                    const before = v.slice(0, el.selectionStart ?? v.length).replace(/\D/g, '').length
                    const { text, caret } = maskPhone(v, before)
                    setPhone(text)
                    requestAnimationFrame(() => { if (document.activeElement === el) el.setSelectionRange(caret, caret) })
                  }}
                  placeholder={PLACEHOLDER.phone}
                  inputMode="tel"
                  invalid={wrong.has('phone')}
                />
              </div>
            </Field>
            <Field label="Сайт">
              <div data-field="site"><ComboField value={site} onChange={setSite} options={[siteFor(dealer)].filter(Boolean)} placeholder={PLACEHOLDER.site} label="Сайт дилера" singleLine invalid={wrong.has('site')} /></div>
            </Field>
          </div>
        </div>
    </>
  )

  const download = (
        <DownloadBar
          format="PDF"
          onClick={handleExport}
          busy={exporting}
          disabled={!ok}
          note={note}
          onNote={toField}
          links={!blank && <LinkButtons incomplete={!ok} file={shareFile} />}
        />
  )

  if (pdfOnly || templateOnly) return null
  // Phones: the canvas over a sheet with the form (trial)
  if (onPhone) return <MobileEditor slides={[{ key: 'sign', label: 'Табличка', ratio: SIGN.h / SIGN.w, node: preview, reset: blank ? undefined : { onClick: reset, label: 'Вернуть табличку по умолчанию' } }]} sidebar={sidebar} download={download} />

  return (
    // The whole page takes a dropped PDF, with nothing on it saying so, as the name tag's canvas
    <div
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) openFile(f) }}
      className="flex min-h-dvh flex-col bg-white font-sans text-black md:h-dvh md:flex-row"
    >

      <aside className="relative flex shrink-0 flex-col md:h-full md:w-[321px] md:overflow-y-auto md:border-r md:border-black/10">
        {sidebar}
        {download}
      </aside>

      <main className="flex flex-1 items-center justify-center bg-surface p-6 pb-[88px] md:min-w-0 md:overflow-y-auto md:p-16">
        {preview}
      </main>

    </div>
  )
}
