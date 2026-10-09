import { useEffect, useMemo, useRef, useState } from 'react'
import type { Font } from 'opentype.js'
import { goal } from '@/ui/metrika'
import { Field, TextInput, ComboField, GeneratorHeader, LinkButtons, DownloadBar, stepsLeft } from '@/ui/form'
import { CaptionReset } from '@/ui/staff'
import { linkParams, useLinkState } from '@/ui/share'
import { loadFont, toD } from '@/livery/geometry'
import { maskPhone, siteFor } from '@/card/card'
import { SIGN, LOGO, buildSign, oneLine, timeText, type SignField, type Input } from '@/hours/sign'
import { DEALER_NAMES, withoutUmo } from '@/data/dealers'
import { DEFAULT_HOURS_LINE, HOURS_LINES, ADDRESSES, addressOf, hoursOf } from '@/data/hours'

// The dealership's hours sign (Figma: UMO | Evrone, node 3819:4211): a 480×680 mm plate with the logo, the hours, a
// line under them and the dealership at the bottom, as a PDF in outlines for the maker. A dealer picked from the list
// puts in its address and hours from umo.auto and its site, all of them edited freely; the phone isn't on umo.auto.

/** The dealers' names without «UMO», as the logo stands over them */
const NAMES = DEALER_NAMES.map(withoutUmo)

/** Empty fields stand grey on the sign as these; never in the PDF */
const PLACEHOLDER: Record<Exclude<SignField, 'line'>, string> = {
  from: '9:00', to: '21:00', dealer: 'Название дилера', address: 'Адрес', phone: '+7 495 000 00 00', site: 'Сайт',
}
/** What an empty field asks for over the download, in the form's order: the first with «Нужно», for the context */
const MISSING: Record<Exclude<SignField, 'line'>, string> = {
  from: 'Указать время', to: 'Указать время', dealer: 'Выбрать дилера', address: 'Указать адрес', phone: 'Указать телефон', site: 'Указать сайт',
}
const ORDER = ['from', 'to', 'dealer', 'address', 'phone', 'site'] as const

/** The hours step by half an hour, from 0:00 to 24:00 */
const STEP = 30
const DAY = 24 * 60
const minutesOf = (t: string) => { const [h, m] = t.split(':'); return +h * 60 + +m }
const timeOf = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`
/** A typed time made whole and taken to the nearest half hour, «9:57» → «10:00» */
const rounded = (raw: string) => {
  const t = timeText(wholeTime(raw))
  return t ? timeOf(Math.min(DAY, Math.round(minutesOf(t) / STEP) * STEP)) : raw
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
function TimeField({ value, onChange, placeholder, invalid, label }: { value: string; onChange: (v: string) => void; placeholder: string; invalid?: boolean; label: string }) {
  const step = (dir: 1 | -1) => {
    const t = timeText(value) ?? placeholder
    const min = minutesOf(t)
    // From a time off the grid, the first step lands on it
    const next = dir > 0 ? Math.floor(min / STEP) * STEP + STEP : Math.ceil(min / STEP) * STEP - STEP
    onChange(timeOf(Math.max(0, Math.min(DAY, next))))
  }
  const button = 'flex w-9 shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-[#808080] outline-none hover:text-black focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-black/40'
  return (
    <div className="flex h-10 rounded-[8px] bg-[#f5f5f5] focus-within:ring-1 focus-within:ring-inset focus-within:ring-black/40">
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
        onBlur={() => onChange(rounded(value))}
        onKeyDown={e => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); step(e.key === 'ArrowUp' ? 1 : -1) }
          if (e.key === 'Enter') onChange(rounded(value))
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
  const [from, setFrom] = useState(() => maskTime(link.get('from') ?? ''))
  const [to, setTo] = useState(() => maskTime(link.get('to') ?? ''))
  const [line, setLine] = useState(link.get('off') === 'line' ? '' : link.get('line') ?? DEFAULT_HOURS_LINE)
  const [dealer, setDealer] = useState(link.get('name') ?? '')
  const [address, setAddress] = useState(() => link.get('address') ?? addressOf(link.get('name') ?? '') ?? '')
  const [phone, setPhone] = useState(link.get('phone') ?? '')
  /** The site follows the dealer's name (`siteFor`) until it's edited: null */
  const [ownSite, setSite] = useState<string | null>(link.get('site'))
  const site = ownSite ?? siteFor(dealer)
  useLinkState({
    from, to,
    line: line === DEFAULT_HOURS_LINE ? null : line,
    off: line.trim() ? null : 'line',
    name: dealer,
    address: address === addressOf(dealer) ? null : address,
    phone,
    site: ownSite,
  })

  const [font, setFont] = useState<Font>()
  const [exporting, setExporting] = useState(false)
  useEffect(() => { loadFont().then(setFont) }, [])

  useEffect(() => {
    const prev = document.title
    document.title = 'Режимник UMO'
    return () => { document.title = prev }
  }, [])

  const values: Record<Exclude<SignField, 'line'>, string> = { from: wholeTime(from), to: wholeTime(to), dealer, address, phone, site }
  const empty = ORDER.filter(f => !oneLine(values[f]))
  const shown: Input = { line, ...Object.fromEntries(ORDER.map(f => [f, oneLine(values[f]) ? values[f] : PLACEHOLDER[f]])) as Omit<Input, 'line'> }
  const sign = useMemo(() => font ? buildSign(font, shown) : undefined, [font, JSON.stringify(shown)]) // eslint-disable-line react-hooks/exhaustive-deps
  /** Faults of what's typed; a placeholder is never one */
  const issues = (sign?.issues ?? []).filter(i => !empty.includes(i.field as typeof ORDER[number]))
  const wrong = new Set(issues.map(i => i.field))
  const ok = !!sign && !empty.length && !issues.length

  // The first thing to do, in the form's order: an empty field or a wrong one
  const firstEmpty = empty[0]
  const firstWrong = ORDER.find(f => wrong.has(f)) ?? (wrong.has('line') ? 'line' : undefined)
  const firstAt = firstEmpty && (!firstWrong || ORDER.indexOf(firstEmpty) <= ORDER.indexOf(firstWrong as typeof ORDER[number])) ? firstEmpty : firstWrong
  const note = !firstAt ? undefined
    : firstAt === firstEmpty ? (firstAt === 'from' || firstAt === 'to' ? `Нужно ${MISSING[firstAt].toLowerCase()}` : MISSING[firstAt])
      : issues.find(i => i.field === firstAt)!.text
  // The two hours ask once
  const left = new Set(empty.map(f => f === 'to' ? 'from' : f)).size + issues.length

  const form = useRef<HTMLDivElement>(null)
  const toField = () => form.current?.querySelector<HTMLElement>(`[data-field="${firstAt}"] input, [data-field="${firstAt}"] textarea`)?.focus()

  const pickDealer = (v: string) => {
    // The address and hours follow the dealer picked while they're empty or the previous dealer's
    const a = addressOf(v)
    if (a && (!address.trim() || address === addressOf(dealer))) setAddress(a)
    const h = hoursOf(v)
    const was = hoursOf(dealer)
    if (h && ((!from.trim() && !to.trim()) || (was && from === was.from && to === was.to))) { setFrom(h.from); setTo(h.to) }
    setDealer(v)
  }

  const blank = !ORDER.some(f => f !== 'site' && oneLine(values[f])) && ownSite === null && line === DEFAULT_HOURS_LINE
  const reset = () => {
    setFrom(''); setTo(''); setLine(DEFAULT_HOURS_LINE); setDealer(''); setAddress(''); setPhone(''); setSite(null)
  }

  const handleExport = async () => {
    if (!sign || !ok) return
    setExporting(true)
    try {
      const { signPdf } = await import('@/hours/pdf')
      const blob = await signPdf(sign)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'UMO_hours-sign.pdf'
      a.click()
      // The line goes along only when it isn't one of the suggestions: what dealers write for themselves
      const listed = HOURS_LINES.includes(oneLine(line))
      goal('download_hours_sign', { from: oneLine(from), to: oneLine(to), dealer: NAMES.includes(oneLine(dealer)), ...(listed ? {} : { line: oneLine(line).slice(0, 100) }) })
      URL.revokeObjectURL(a.href)
    } finally {
      setExporting(false)
    }
  }

  const fill = (field: SignField | 'fixed') =>
    field === 'fixed' ? '#000' : wrong.has(field) ? ALERT : field !== 'line' && empty.includes(field) ? GHOST : '#000'
  const byFill = new Map<string, string>()
  for (const p of sign?.parts ?? []) byFill.set(fill(p.field), (byFill.get(fill(p.field)) ?? '') + toD(p.cmds))

  return (
    <div className="flex min-h-dvh flex-col bg-white font-sans text-black md:h-dvh md:flex-row">

      <aside className="relative flex shrink-0 flex-col md:h-full md:w-[321px] md:overflow-y-auto md:border-r md:border-black/10">
        <div className="flex flex-col gap-6 p-6 tracking-[-0.01em] md:pb-2">
          <GeneratorHeader current="/hours-sign" />

          <div ref={form} className="flex flex-col gap-4 tracking-normal">
            <Field label="Часы работы">
              <div className="grid grid-cols-2 gap-2 [font-variant-numeric:lining-nums_tabular-nums]">
                <div data-field="from"><TimeField value={from} onChange={setFrom} placeholder={PLACEHOLDER.from} label="Открытие" invalid={wrong.has('from')} /></div>
                <div data-field="to"><TimeField value={to} onChange={setTo} placeholder={PLACEHOLDER.to} label="Закрытие" invalid={wrong.has('to')} /></div>
              </div>
            </Field>
            <Field label="Подпись">
              <div data-field="line"><ComboField value={line} onChange={setLine} options={HOURS_LINES} label="Подписи" singleLine invalid={wrong.has('line')} /></div>
            </Field>
            <Field label="Дилер">
              <div data-field="dealer"><ComboField value={dealer} onChange={pickDealer} options={NAMES} placeholder={PLACEHOLDER.dealer} label="Дилеры UMO" singleLine invalid={wrong.has('dealer')} /></div>
            </Field>
            <Field label="Адрес">
              {/* The dealer's own address first, then every dealer's, narrowed as it's typed */}
              <div data-field="address"><ComboField value={address} onChange={setAddress} options={[...new Set([addressOf(dealer), ...ADDRESSES].filter((a): a is string => !!a))]} placeholder={PLACEHOLDER.address} label="Адреса дилеров" singleLine invalid={wrong.has('address')} /></div>
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

        <DownloadBar
          format="PDF"
          onClick={handleExport}
          busy={exporting}
          disabled={!ok}
          note={note}
          count={stepsLeft(left)}
          onNote={toField}
          links={!blank && <LinkButtons incomplete={!ok} />}
        />
      </aside>

      <main className="flex flex-1 items-center justify-center bg-[#f5f5f5] p-6 pb-[88px] md:min-w-0 md:overflow-y-auto md:p-16">
        <figure className="flex w-full flex-col items-center gap-2">
          {/* As tall as the canvas allows on wide screens, as wide as it on phones */}
          <svg viewBox={`0 0 ${SIGN.w} ${SIGN.h}`} className="block h-auto w-full max-w-[480px] bg-white md:h-[calc(100dvh-128px-30px)] md:w-auto md:max-w-full" role="img" aria-label="Режимник">
            <path d={toD(LOGO)} fill="#000" fillRule="evenodd" />
            {[...byFill].map(([color, d]) => <path key={color} d={d} fill={color} />)}
          </svg>
          <figcaption className="mt-0.5 text-center text-[14px] leading-5 text-[#808080]">
            <span className="relative">
              Табличка, {SIGN.w}&nbsp;×&nbsp;{SIGN.h}&nbsp;мм
              {!blank && <CaptionReset onClick={reset} label="Вернуть табличку по умолчанию" />}
            </span>
          </figcaption>
        </figure>
      </main>

    </div>
  )
}
