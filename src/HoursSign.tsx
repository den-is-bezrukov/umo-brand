import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Font } from 'opentype.js'
import { goal } from '@/ui/metrika'
import { Field, TextInput, ComboField, GeneratorHeader, LinkButtons, DownloadBar, Segments, SegBtn } from '@/ui/form'
import { flash } from '@/ui/formUtils'
import { isPdf, readPdfData } from '@/ui/pdfData'
import { CaptionReset } from '@/ui/staff'
import { linkParams, useLinkState, saveAndOpenPdf } from '@/ui/share'
import { toD } from '@/livery/geometry'
import { maskPhone, phoneMaskTail, siteFor } from '@/card/card'
import { SIGN, SIGN_KEY, FIELDS, HOURS, VARIANTS, buildSign, signLogo, timeText, type SignField, type SignFieldSpec, type Input } from '@/hours/sign'
import { loadFont, oneLine } from '@/ui/type'
import { POINT_NAMES, pointFilter, withoutBrand, phoneOf } from '@/data/points'
import { addressOf, hoursOf } from '@/data/hours'
import { MobileEditor } from '@/ui/mobile'
import { usePhone } from '@/ui/usePhone'
import { recordText } from '@/ui/liveText'
import { TemplateButton } from '@/ui/template'
import { useTemplateLink } from '@/ui/useTemplateLink'
import { SITE } from '@/site'
import { WORDS } from '@brand/words'

/** What the brand calls its points (`@brand/words`) */
const W = WORDS.point

// The hours sign: the hours and the brand's fields (`@brand/hours-sign`), as a PDF in outlines for the maker. A
// point picked from the list puts in its address and hours from the brand's site and its site, all of them edited
// freely; the phone from the hand-kept list.

/** The points' names without the brand's name, which the sign puts before them, fixed */
const NAMES = POINT_NAMES.map(withoutBrand)

/** The field of each kind, if the brand's sign has one */
const byKind = (kind: SignFieldSpec['kind']) => FIELDS.find(f => f.kind === kind)
const POINT = byKind('point')
const SITE_FIELD = byKind('site')
/** A field's name in a link and the cards' data */
const paramOf = (f: SignFieldSpec) => f.param ?? f.id

/** Empty fields stand grey on the sign as these; never in the PDF */
const PLACEHOLDER: Input = { from: HOURS.placeholder[0], to: HOURS.placeholder[1], ...Object.fromEntries(FIELDS.map(f => [f.id, f.placeholder])) }
/** What an empty field asks for in the download button, in the form's order */
const MISSING: Record<SignField, string> = { from: 'Указать время', to: 'Указать время', ...Object.fromEntries(FIELDS.map(f => [f.id, f.missing])) }
/** What each field starts with, and comes back to with the reset */
const DEFAULTS: Input = { from: HOURS.default?.[0] ?? '', to: HOURS.default?.[1] ?? '', ...Object.fromEntries(FIELDS.map(f => [f.id, f.default ?? ''])) }
const ORDER = ['from', 'to', ...FIELDS.map(f => f.id)]

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
 * The hours as one slider with two knobs (the brand's `hours.slider`), half an hour a step over 0:00–24:00, the day
 * between them filled and their times over it; a knob stops half an hour short of the other. Each knob is a range of
 * its own laid over the track, only its knob taking the pointer (`.hours-range` in index.css), ← → by the keys
 */
function HoursSlider({ from, to, onFrom, onTo }: { from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }) {
  const steps = DAY / STEP
  const a = minutesOf(timeText(wholeTime(from)) ?? PLACEHOLDER.from) / STEP
  const b = minutesOf(timeText(wholeTime(to)) ?? PLACEHOLDER.to) / STEP
  const knob = (id: 'from' | 'to', value: number, label: string, set: (v: number) => void) => (
    <span data-field={id} className="contents">
      <input type="range" min={0} max={steps} step={1} value={value} onChange={e => set(+e.target.value)} aria-label={label} aria-valuetext={timeOf(value * STEP)} className="hours-range" />
    </span>
  )
  return (
    <div className="flex flex-col gap-2 [font-variant-numeric:lining-nums_tabular-nums]">
      <div className="flex justify-between text-[14px] leading-5"><span>{timeOf(a * STEP)}</span><span>{timeOf(b * STEP)}</span></div>
      <div className="relative h-4">
        <div className="absolute inset-0 rounded-full bg-surface shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-ink)_10%,transparent)]" />
        <div className="absolute inset-y-0 rounded-full bg-accent" style={{ left: `calc((100% - 16px) * ${a / steps})`, width: `calc((100% - 16px) * ${(b - a) / steps} + 16px)` }} />
        {knob('from', a, 'Открытие', v => onFrom(timeOf(Math.min(v, b - 1) * STEP)))}
        {knob('to', b, 'Закрытие', v => onTo(timeOf(Math.max(v, a + 1) * STEP)))}
      </div>
    </div>
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
  const button = 'flex w-9 shrink-0 cursor-pointer items-center justify-center rounded-control text-caption hover:text-ink'
  return (
    <div data-ui="input" className="flex h-10 in-[[data-sheet]]:h-12! rounded-control bg-surface focus-within:ring-1 focus-within:ring-inset focus-within:ring-ink/40">
      <button type="button" tabIndex={-1} onClick={() => step(-1)} aria-label={`${label}: на полчаса раньше`} className={button}><StepIcon /></button>
      {/* The typed time over a copy of it with the rest of «9:00» grey after it, so the colon always shows: the copy
          sizes the box, centred, and the input lies over it */}
      <label className="flex min-w-0 flex-1 cursor-text items-center justify-center text-[14px] leading-5 [font-variant-numeric:lining-nums_tabular-nums]">
        <span className="relative whitespace-pre">
          <span aria-hidden className="text-ink">{value}</span>
          <span aria-hidden className="text-hint">{value ? tailOf(value) : placeholder}</span>
          <input
        value={value}
        onChange={e => onChange(maskTime(e.target.value))}
        onBlur={() => onCommit(rounded(value, min, max))}
        onKeyDown={e => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); step(e.key === 'ArrowUp' ? 1 : -1) }
          if (e.key === 'Enter') onCommit(rounded(value, min, max))
        }}
        style={{ color: 'transparent', caretColor: 'var(--color-ink)' }}
        inputMode="decimal"
        aria-label={label}
        aria-invalid={invalid || undefined}
        className="absolute inset-y-0 left-0 w-[calc(100%+2px)] bg-transparent p-0 text-ink outline-none"
      />
        </span>
      </label>
      <button type="button" tabIndex={-1} onClick={() => step(1)} aria-label={`${label}: на полчаса позже`} className={button}><StepIcon plus /></button>
    </div>
  )
}

const GHOST = 'var(--color-ghost)'
const ALERT = 'var(--color-error)'

export default function HoursSign() {
  const [link] = useState(linkParams)
  /** The point a link names, as written */
  const linked = POINT ? link.get(paramOf(POINT)) ?? '' : ''
  // A listed point's hours from the brand's site stand in for the times a link leaves out, as its address does
  const [from, setFrom] = useState(() => maskTime(link.get('from') ?? hoursOf(linked)?.from ?? DEFAULTS.from))
  const [to, setTo] = useState(() => maskTime(link.get('to') ?? hoursOf(linked)?.to ?? DEFAULTS.to))
  // A name with the brand's name (a link made by hand) loses it, as the sign puts it before the name; a phone takes the field's mask
  const [fields, setFields] = useState<Input>(() => Object.fromEntries(FIELDS.filter(f => f.kind !== 'site').map(f => {
    const v = link.get(paramOf(f))
    return [f.id,
      f.kind === 'point' ? withoutBrand(v ?? '')
        : f.kind === 'address' ? v ?? (POINT && addressOf(linked)) ?? DEFAULTS[f.id]
          : f.kind === 'phone' ? maskPhone(v ?? (POINT && phoneOf(linked)) ?? DEFAULTS[f.id]).text
            : v ?? DEFAULTS[f.id]]
  })))
  const set = (id: string, v: string) => setFields(f => ({ ...f, [id]: v }))
  const point = POINT ? fields[POINT.id] : ''
  /** A point's phone as the field writes it */
  const pointPhone = (name: string) => { const p = phoneOf(name); return p ? maskPhone(p).text : undefined }
  /** The site follows the point's name (`siteFor`) until it's edited: null */
  const [ownSite, setSite] = useState<string | null>(SITE_FIELD ? link.get(paramOf(SITE_FIELD)) : null)
  const site = ownSite ?? siteFor(point)
  /** Which of the brand's variants (black, white), the first by default */
  const [variant, setVariant] = useState(() => VARIANTS[+(link.get('variant') ?? 0)] ? +(link.get('variant') ?? 0) : 0)
  /** What a field would have of itself: the picked point's address or phone, else its default */
  const auto = (f: SignFieldSpec) => (f.kind === 'address' && POINT ? addressOf(point) : f.kind === 'phone' && POINT ? pointPhone(point) : undefined) ?? f.default
  useLinkState({
    from, to,
    ...Object.fromEntries(FIELDS.map(f => [paramOf(f), f.kind === 'site' ? ownSite : f.kind === 'point' ? fields[f.id] : fields[f.id] === auto(f) ? null : fields[f.id]])),
    ...(VARIANTS.length > 1 && { variant: variant ? String(variant) : null }),
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

  const values: Input = { from: wholeTime(from), to: wholeTime(to), ...fields, ...(SITE_FIELD && { [SITE_FIELD.id]: site }) }
  const empty = ORDER.filter(f => !oneLine(values[f]))
  const shown: Input = Object.fromEntries(ORDER.map(f => [f, oneLine(values[f]) ? values[f] : PLACEHOLDER[f]]))
  // Its lines noted too, for the editable template
  const built = useMemo(() => font ? recordText(() => buildSign(font, shown, variant)) : undefined, [font, JSON.stringify(shown), variant]) // eslint-disable-line react-hooks/exhaustive-deps
  const sign = built?.result
  /** Faults of what's typed; a placeholder is never one */
  const issues = (sign?.issues ?? []).filter(i => !empty.includes(i.field))
  const wrong = new Set(issues.map(i => i.field))
  const ok = !!sign && !empty.length && !issues.length

  // The first thing to do, in the form's order: an empty field or a wrong one
  const firstEmpty = empty[0]
  const firstWrong = ORDER.find(f => wrong.has(f))
  const firstAt = firstEmpty && (!firstWrong || ORDER.indexOf(firstEmpty) <= ORDER.indexOf(firstWrong)) ? firstEmpty : firstWrong
  const note = !firstAt ? undefined
    : firstAt === firstEmpty ? MISSING[firstAt]
      : issues.find(i => i.field === firstAt)!.text

  const form = useRef<HTMLDivElement>(null)
  const toField = () => form.current?.querySelector<HTMLElement>(`[data-field="${firstAt}"] input, [data-field="${firstAt}"] textarea`)?.focus()

  const pickPoint = (v: string) => {
    // The address, phone and hours follow the point picked while they're empty or the previous point's
    const next = { ...fields, [POINT!.id]: v }
    for (const f of FIELDS) {
      const now = f.kind === 'address' ? addressOf(v) : f.kind === 'phone' ? pointPhone(v) : undefined
      const was = f.kind === 'address' ? addressOf(point) : f.kind === 'phone' ? pointPhone(point) : undefined
      if (now && (!fields[f.id].trim() || fields[f.id] === was)) next[f.id] = now
    }
    const h = hoursOf(v)
    const was = hoursOf(point)
    if (h && ((!from.trim() && !to.trim()) || (was && from === was.from && to === was.to))) { setFrom(h.from); setTo(h.to) }
    setFields(next)
  }

  const blank = ORDER.every(f => f === SITE_FIELD?.id || oneLine(values[f]) === DEFAULTS[f]) && ownSite === null && variant === 0
  const reset = () => {
    setFrom(DEFAULTS.from); setTo(DEFAULTS.to); setFields(Object.fromEntries(Object.keys(fields).map(id => [id, DEFAULTS[id]]))); setSite(null); setVariant(0)
  }

  /** What the sign was made from, kept in its PDF (`SIGN_KEY`) */
  const data = () => ({
    from, to,
    ...Object.fromEntries(FIELDS.map(f => [f.id, f.kind === 'site' ? ownSite : fields[f.id]])),
    ...(VARIANTS.length > 1 && { variant }),
  })
  const pdfOf = async (s: NonNullable<typeof sign>) => {
    const { signPdf, SIGN_FILE } = await import('@/hours/pdf')
    return { blob: await signPdf(s, data(), variant), name: SIGN_FILE }
  }
  /** The sign's PDF for «Поделиться» to send, made again as it changes */
  const shareFile = useCallback(async () => {
    const { blob, name } = await pdfOf(sign!)
    return new File([blob], name, { type: 'application/pdf' })
  }, [sign, from, to, fields, ownSite, variant]) // eslint-disable-line react-hooks/exhaustive-deps
  const downloadGoal = (extra?: Record<string, unknown>) =>
    goal('download_hours_sign', { from: oneLine(from), to: oneLine(to), ...(POINT && { dealer: NAMES.includes(oneLine(point)) }), ...extra })

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
  const makeTemplate = built ? () => import('@/hours/pdf').then(m => m.signTemplate(built.result, built.lines, variant)) : undefined
  /** The blank one a `template` link gives: every field its placeholder */
  const makeBlank = font ? () => {
    const one = recordText(() => buildSign(font, PLACEHOLDER))
    return import('@/hours/pdf').then(m => m.signTemplate(one.result, one.lines))
  } : undefined
  const templateOnly = useTemplateLink(makeBlank, `${SITE.file}_hours-sign_template.pdf`, 'download_hours_sign_template')

  // `pdf` in the link (a link made for the point) opens the sign's PDF itself, with no editor, once the font
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
    const d = isPdf(bytes) ? readPdfData(bytes, SIGN_KEY) as Record<string, unknown> | undefined : undefined
    if (!d || typeof d !== 'object') { flash('В файле нет режимника'); return }
    const text = (v: unknown) => typeof v === 'string' ? v : ''
    setFrom(maskTime(text(d.from))); setTo(maskTime(text(d.to)))
    setFields(Object.fromEntries(Object.keys(fields).map(id => [id, text(d[id])])))
    if (SITE_FIELD) setSite(typeof d[SITE_FIELD.id] === 'string' ? d[SITE_FIELD.id] as string : null)
    setVariant(typeof d.variant === 'number' && VARIANTS[d.variant] ? d.variant : 0)
  }

  /** A day under 8 hours, the shortest any point works (10:00–18:00): likely a typo, said under the sign */
  const short = !empty.includes('from') && !empty.includes('to') && !!timeText(values.from) && !!timeText(values.to)
    && minutesOf(timeText(values.to)!) - minutesOf(timeText(values.from)!) < SHORT_DAY

  const dark = !!VARIANTS[variant]?.dark
  const ink = dark ? '#fff' : '#000'
  const fill = (field: SignField | 'fixed') =>
    field === 'fixed' ? ink : wrong.has(field) ? ALERT : empty.includes(field) ? GHOST : ink
  const byFill = new Map<string, string>()
  for (const p of sign?.parts ?? []) byFill.set(fill(p.field), (byFill.get(fill(p.field)) ?? '') + toD(p.cmds))

  const preview = (
    <>
        <figure className="flex w-full flex-col items-center gap-2">
          {/* As tall as the canvas allows on wide screens, as wide as it on phones; on wide screens its width is the
              smaller of the canvas's and the one the height allows (the sheet's width to its height), so a narrow
              canvas shrinks the sign whole: a fixed height with the width capped stretched its box past the sheet */}
          <svg viewBox={`0 0 ${SIGN.w} ${SIGN.h}`} style={{ '--ratio': SIGN.w / SIGN.h, background: dark ? '#000' : '#fff' } as React.CSSProperties} className="block h-auto w-full max-w-[480px] md:w-[min(100%,calc((100dvh-128px-30px)*var(--ratio)))] md:max-w-none" role="img" aria-label="Режимник">
            <path d={toD(signLogo(variant))} fill={ink} fillRule="evenodd" />
            {[...byFill].map(([color, d]) => <path key={color} d={d} style={{ fill: color }} />)}
          </svg>
          <figcaption className="mt-0.5 text-center text-[14px] leading-5 text-caption">
            <span className="relative">
              Табличка, {SIGN.w}&nbsp;×&nbsp;{SIGN.h}&nbsp;мм
              <CaptionReset onClick={blank ? undefined : reset} label="Вернуть табличку по умолчанию" extra={<TemplateButton make={makeTemplate} name={`${SITE.file}_hours-sign_template.pdf`} goalId="download_hours_sign_template" />} />
            </span>
          </figcaption>
          {/* A warning in red, as the generators' faults under their pictures, but the download stays on, as a short day can be meant (a holiday) */}
          {short && <p className="text-center text-[14px] leading-5 text-error">День короче 8&nbsp;часов&nbsp;— проверьте время</p>}
        </figure>
    </>
  )

  /** A field of the brand's as its kind asks */
  const input = (f: SignFieldSpec) => {
    const invalid = wrong.has(f.id)
    if (f.kind === 'point') return <ComboField value={fields[f.id]} onChange={pickPoint} options={NAMES} filter={pointFilter} placeholder={f.placeholder} label={`${W.many} ${SITE.name}`} singleLine invalid={invalid} />
    if (f.kind === 'site') return <ComboField value={site} onChange={setSite} options={[siteFor(point)].filter(Boolean)} placeholder={f.placeholder} label={`Сайт ${W.of}`} singleLine invalid={invalid} />
    if (f.kind === 'phone') return (
      // A live mask, as the business card's: set as the sign sets it while it's typed, the caret after the same digit
      <TextInput
        value={fields[f.id]}
        onChange={v => {
          const el = document.activeElement as HTMLInputElement
          const before = v.slice(0, el.selectionStart ?? v.length).replace(/\D/g, '').length
          const { text, caret } = maskPhone(v, before)
          set(f.id, text)
          requestAnimationFrame(() => { if (document.activeElement === el) el.setSelectionRange(caret, caret) })
        }}
        placeholder={f.placeholder}
        maskTail={phoneMaskTail(fields[f.id])}
        inputMode="tel"
        invalid={invalid}
      />
    )
    // The address a plain field, as the business card's: the point's put in as it's picked, edited by hand (a list of
    // every point's address let a picked point take another's)
    return <TextInput value={fields[f.id]} onChange={v => set(f.id, v)} placeholder={f.placeholder} invalid={invalid} />
  }

  const sidebar = (
    <>
        <div data-ui="sidebar-body" className="flex flex-col gap-6 p-6 tracking-[-0.01em] md:pb-2">
          <GeneratorHeader current="/hours-sign" />

          <div ref={form} data-ui="form" className="flex flex-col gap-4 tracking-normal">
            <Field label="Часы работы">
              {HOURS.slider
                ? <HoursSlider from={from} to={to} onFrom={setFrom} onTo={setTo} />
                : <div className="grid grid-cols-2 gap-2 [font-variant-numeric:lining-nums_tabular-nums]">
                    <div data-field="from"><TimeField value={from} onChange={setFrom} onCommit={commitFrom} placeholder={PLACEHOLDER.from} label="Открытие" invalid={wrong.has('from')} min={0} max={DAY - STEP} /></div>
                    <div data-field="to"><TimeField value={to} onChange={setTo} onCommit={commitTo} placeholder={PLACEHOLDER.to} label="Закрытие" invalid={wrong.has('to')} min={STEP} max={DAY} /></div>
                  </div>}
            </Field>
            {FIELDS.map(f => (
              <Field key={f.id} label={f.label}>
                <div data-field={f.id}>{input(f)}</div>
              </Field>
            ))}
            {VARIANTS.length > 1 && (
              <Field label="Фон">
                <Segments>
                  {VARIANTS.map((v, i) => <SegBtn key={v.label} active={variant === i} onClick={() => setVariant(i)}>{v.label}</SegBtn>)}
                </Segments>
              </Field>
            )}
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
      className="flex min-h-dvh flex-col bg-paper font-sans text-ink md:h-dvh md:flex-row"
    >

      <aside data-ui="sidebar" className="relative flex shrink-0 flex-col md:h-full md:w-[321px] md:overflow-y-auto md:border-r md:border-ink/10">
        {sidebar}
        {download}
      </aside>

      <main className="flex flex-1 items-center justify-center bg-surface p-6 pb-[88px] md:min-w-0 md:overflow-y-auto md:p-16">
        {preview}
      </main>

    </div>
  )
}
