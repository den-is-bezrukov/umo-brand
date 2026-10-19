import { useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { goal } from './metrika'
import { GENERATORS } from '@/data/generators'
import HelpButton from './help'
import Ring from './Ring'
import { ChevronIcon } from './icons'
import { InFoot, InSheet, SheetLayer, FOOT_BG } from './phone'
import { MOD, withMod, otherLayout } from './keys'

// Sidebar controls shared by the generators (price card, dealer livery, plate frame, name tag, business card). Light UI per the Figma layout
// (UMO | Evrone, nodes 4844:6865 and 4900:4588), matching the brand guide.

/** The tick of checkboxes and of a good link (Figma 4900:4657, 5015:11196): a 2 px stroke with square ends and bevelled corners, as every icon here */
function Tick({ color = 'black' }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M11.5 4L5.5 10L2.5 7" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="bevel" />
    </svg>
  )
}


/**
 * The breadcrumbs underline on hover as the guide's links do (Figma 4865:1061): black at 40%, fading out, 0.35 px (2.5%
 * of their 14 px). The generators' names don't: they are navigation, as the guide's contents, and only darken
 */
const crumb = 'underline decoration-transparent decoration-[0.35px] underline-offset-[25%] [text-decoration-skip-ink:none] transition-[text-decoration-color] duration-250 hover:decoration-black/40 hover:duration-0'

/**
 * The top of a generator's form, the same on every screen (Figma 5098:5487, the phone's, carried over to wide screens):
 * the breadcrumbs in Medium, 16 px tall, «Бренд UMO · Редактор материалов», as the guide's quick link names it; the generators' line under them
 * (`GeneratorRing`). «Редактор материалов», the app itself, opens every generator in place, nothing in the row moving
 * (a chevron after it was tried, and only cluttered the row), and the line and everything after it in the form give
 * way to every generator, 24 px Medium 16 px apart, the current one black (Figma 5103:6083). The crumb again, the current
 * name or Esc fold it. Not a menu icon by the crumbs: the generators are an app of their own, where a burger promised the
 * whole app's menu and opened only the generators' list
 */
export function GeneratorHeader({ current }: { current: '/price-card' | '/livery' | '/plate-frame' | '/name-tag' | '/business-card' | '/price-tag' | '/hours-sign' | '/memo' }) {
  const [menu, setMenu] = useState(false)
  const toggle = () => { if (!menu) goal('open_menu', { page: location.pathname }); setMenu(!menu) }
  // While it's open the rest of the form and the download step aside (`html[data-menu]` in index.css)
  useEffect(() => {
    if (!menu) return
    document.documentElement.dataset.menu = ''
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false) }
    document.addEventListener('keydown', key)
    return () => { delete document.documentElement.dataset.menu; document.removeEventListener('keydown', key) }
  }, [menu])
  const name = 'text-[24px] font-medium leading-6 tracking-[-0.01em] whitespace-nowrap'
  return (
    <div data-head className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <PhoneCrumbs open={menu} onEditor={toggle} />
        <HelpButton page={current} tabs={GENERATORS} />
      </div>
      {menu ? (
        // 20 px under the crumbs, as the line's names stand (its 4 px over them), so the first name doesn't jump up
        <nav aria-label="Конструкторы" className="mt-1 flex flex-col items-start gap-4">
          {GENERATORS.map(g => g.path === current
            ? <button key={g.path} type="button" aria-current="page" onClick={() => setMenu(false)} className={`${name} cursor-pointer text-left`}>{g.title}</button>
            : <Link key={g.path} to={g.path} className={`${name} text-[#bfbfbf] hover:text-[#808080] active:text-[#808080]`}>{g.title}</Link>)}
        </nav>
      ) : (
        <GeneratorRing current={current} />
      )}
    </div>
  )
}

/** The breadcrumbs' type: Medium (Regular in Figma 5110:9105), on 16 px lines, with no tracking, as the form's labels */
const CRUMBS = "text-[14px] font-medium leading-4 tracking-normal [font-feature-settings:'case'_1]"

/**
 * The breadcrumbs, set apart from the form's tighter tracking so they don't shift when the list opens: the way back to
 * the guide (UMO's logo leads to umo.auto, so it isn't here) and Редактор материалов, the app itself, which shows
 * every generator (Материалы, the guide's chapter, stood between them)
 */
function PhoneCrumbs({ open, onEditor }: { open: boolean; onEditor: () => void }) {
  return (
    <nav className={`flex min-w-0 flex-1 items-center gap-2 whitespace-nowrap ${CRUMBS}`}>
      <Link to="/" className={crumb}>Бренд UMO</Link>
      <span aria-hidden>·</span>
      <button type="button" onClick={onEditor} aria-expanded={open} aria-label="Редактор материалов: все конструкторы" className={`${crumb} cursor-pointer`}>Редактор материалов</button>
    </nav>
  )
}

/**
 * The generators' line, the site's `Ring`: a pick opens the generator (from the keys with the focus kept on the next
 * page's line, so ← → go on turning it); the current one is the page's heading, the others links
 */
function GeneratorRing({ current }: { current: string }) {
  const navigate = useNavigate()
  const turned = (useLocation().state as { turned?: boolean } | null)?.turned
  return (
    <Ring
      label="Конструкторы"
      items={GENERATORS.map(g => ({ key: g.path, title: g.title }))}
      current={current}
      onPick={(path, keys) => navigate(path, keys ? { state: { turned: true } } : undefined)}
      href={path => path}
      heading
      focus={turned}
    />
  )
}

export function isValidUrl(v: string): boolean {
  if (!v.trim()) return false
  try {
    const u = new URL(v.trim())
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    const host = u.hostname
    if (!host || host.includes(' ')) return false
    if (!host.includes('.')) return false
    if (host.startsWith('.') || host.endsWith('.')) return false
    const parts = host.split('.')
    const tld = parts[parts.length - 1]
    if (tld.length < 2) return false
    // each label must be non-empty and contain only valid chars
    if (parts.some(p => p.length === 0 || /[^a-zA-Z0-9\-_]/.test(p))) return false
    return true
  } catch {
    return false
  }
}

export function SegBtn({ active, onClick, disabled, title, children }: { active: boolean; onClick: () => void; disabled?: boolean; title?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={`flex-1 min-w-0 flex items-center justify-center rounded-[8px] border px-3 py-[9px] in-[[data-sheet]]:py-[13px]! cursor-pointer
        disabled:cursor-not-allowed disabled:text-[#999]
        ${active ? 'border-black/10 bg-white text-black' : 'border-transparent text-[#808080]'}`}
    >
      <span className="font-medium text-[14px] leading-5 whitespace-nowrap">{children}</span>
    </button>
  )
}

// Spacing per Figma (UMO | Evrone, node 4900:4595): 8 px from a label to its control, labels on 16 px lines (5008:10789;
// a checkbox's row too, as tall as its box, and the words at the end of a label row), 16 px between groups — the gap
// of the column the groups sit in.

/**
 * A field with an error isn't edged in red: its label turns red instead, found by the control's aria-invalid under it
 * (`ALERT_LABEL` on the label, `group/field` on what holds both), so every generator's fields do it with nothing passed
 */
export const ALERT_LABEL = 'group-has-[[aria-invalid=true]]/field:text-[#e30]'

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group/field flex flex-col gap-3">
      <p className={`text-[14px] leading-4 text-[#808080] whitespace-nowrap ${ALERT_LABEL}`}>{label}</p>
      {children}
    </div>
  )
}

export function Segments({ children }: { children: React.ReactNode }) {
  // The picked one a white tile edged at 10% on the grey, the others grey text; no hover (Figma 5015:11137)
  return <div className="flex rounded-[8px] bg-[#f5f5f5]">{children}</div>
}

/**
 * A number one step up or down with ↑ ↓, as the hours sign's times go by half an hour: from a number off the steps the
 * first lands on one; an empty field takes its placeholder's
 */
function stepped(value: string, placeholder: string, dir: 1 | -1, step: number, max: number) {
  const digits = (t: string) => parseInt(t.split(',')[0].replace(/\D/g, ''), 10)
  const n = digits(value)
  if (Number.isNaN(n)) return String(digits(placeholder) || 0)
  const next = dir > 0 ? Math.floor(n / step) * step + step : Math.ceil(n / step) * step - step
  return String(Math.max(0, Math.min(max, next)))
}

export function TextInput({ value, onChange, onBlur, onPaste, placeholder, invalid, numeric, step, max = Infinity, inputMode, list, className = '' }: { value: string; onChange: (v: string) => void; onBlur?: () => void; onPaste?: (e: React.ClipboardEvent) => void; placeholder?: string; invalid?: boolean; numeric?: boolean; /** ↑ ↓ change the number by this */ step?: number; max?: number; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; list?: string; className?: string }) {
  return (
    <input
      value={value}
      onKeyDown={step ? e => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
        e.preventDefault()
        onChange(stepped(value, placeholder ?? '', e.key === 'ArrowUp' ? 1 : -1, step, max))
      } : undefined}
      list={list}
      onChange={e => onChange(e.target.value)}
      onBlur={() => onBlur?.()}
      onPaste={onPaste}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      inputMode={inputMode ?? (numeric ? 'numeric' : undefined)}
      pattern={numeric ? '[0-9 ]*' : undefined}
      className={`h-10 in-[[data-sheet]]:h-12! w-full min-w-0 rounded-[8px] bg-[#f5f5f5] px-3 text-[14px] leading-5 text-black outline-none placeholder:text-[#999]
        focus:ring-1 focus:ring-inset focus:ring-black/40 ${className}`}
    />
  )
}

/** A one-line-tall textarea that grows with its text; the column is fluid on phones, so it refits on resize too */
function useAutoHeight(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [value])
  return ref
}

const areaClass = 'block min-h-10 in-[[data-sheet]]:min-h-12! in-[[data-sheet]]:py-[14px]! w-full min-w-0 resize-none overflow-hidden rounded-[8px] bg-[#f5f5f5] py-[10px] px-3 text-[14px] leading-5 text-black outline-none placeholder:text-[#999]'

/** Multi-line text where Enter is a line break the layout keeps */
export function TextArea({ value, onChange, placeholder, invalid, className = '', ...rest }: { value: string; onChange: (v: string) => void; placeholder?: string; invalid?: boolean; className?: string } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>) {
  const ref = useAutoHeight(value)
  return (
    <textarea
      {...rest}
      ref={ref}
      rows={1}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      className={`${areaClass} focus:ring-1 focus:ring-inset focus:ring-black/40 ${className}`}
    />
  )
}

const oneLine = (t: string) => t.replace(/\s+/g, ' ').trim().toLowerCase()
const ANCHOR = typeof CSS !== 'undefined' && CSS.supports('anchor-name: --a')

/**
 * A text field (Enter breaks the line) with suggestions under it while it's focused, narrowed to those containing what's
 * typed — a combobox on the platform: the list is a manual popover (the browser lays it over everything) placed under
 * the field by CSS anchor positioning (Chrome, Safari 26; elsewhere from the field's box when it opens). Arrows move
 * through it, Enter picks, Esc or leaving the field closes it; the chevron opens the whole list. An option may carry a
 * line break, kept in the value it gives and shown as a space in the list. First made for the name tag's position
 */
export function ComboField({ value, onChange, options, placeholder, label, invalid, singleLine, shownAs = t => t, truncate, filter }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; label: string; invalid?: boolean; /** Enter doesn't break the line, pasted breaks become spaces */ singleLine?: boolean; /** How an option reads in the list, when it differs from the value it gives */ shownAs?: (t: string) => string; /** One line, cut off with an ellipsis, rather than growing: for a narrow field (the price tag's caption on phones) */ truncate?: boolean; /** The options for what's typed, when containing it isn't enough: the dealers by city, street or any spelling (`dealerFilter`) */ filter?: (typed: string, options: string[]) => string[] }) {
  const box = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [all, setAll] = useState(false)
  const [active, setActive] = useState(-1)
  const typed = value.replace(/\s+/g, ' ').trim().toLowerCase()
  const hit = options.find(t => oneLine(t) === typed)
  // Typed in the wrong layout too («fufn» finds АГАТ), after what's found as typed
  const swapped = otherLayout(typed)
  const find = (q: string) => (filter ? filter(q, options) : options.filter(t => oneLine(t).includes(q)))
  const found = find(typed)
  const matching = swapped === typed ? found : [...found, ...find(swapped).filter(t => !found.includes(t))]
  const shown = all || !typed || hit || !matching.length ? options : matching
  const id = useId()
  // In the phone's sheet the list is a screen of its own, as a search: the field over it with «Готово», the list filling
  // the rest, within the sheet as it stands (it was over the whole screen, wider and taller than the sheet). It opens
  // with no keyboard, the list in full view for a pick; a tap on its field brings the keyboard to type, the sheet going
  // over the whole screen with it as for any field
  const inSheet = !!useContext(InSheet)
  const layer = useContext(SheetLayer)
  const [screen, setScreen] = useState(false)
  const screenField = useRef<HTMLDivElement>(null)
  const openScreen = () => {
    (document.activeElement as HTMLElement | null)?.blur()
    setScreen(true)
  }
  const closeScreen = () => { setScreen(false); setAll(false) }
  // A tap over the sheet (the picture) closes it, as «Готово», and does nothing else there (it lowered the sheet); a drag
  // there still takes the sheet, as its click goes nowhere
  useEffect(() => {
    const sheet = layer.el?.parentElement
    if (!screen || !sheet) return
    const tap = (e: MouseEvent) => {
      if (sheet.contains(e.target as Node)) return
      e.stopPropagation()
      closeScreen()
    }
    document.addEventListener('click', tap, true)
    return () => document.removeEventListener('click', tap, true)
  }, [screen, layer.el]) // eslint-disable-line react-hooks/exhaustive-deps
  /** Each field its own anchor */
  const anchor = `--combo${id.replace(/[^a-z0-9]/gi, '')}`

  useEffect(() => {
    const el = list.current
    if (!el) return
    if (open && !el.matches(':popover-open')) {
      if (!ANCHOR && box.current) {
        const r = box.current.getBoundingClientRect()
        Object.assign(el.style, { top: `${r.bottom + 4}px`, left: `${r.left}px`, width: `${r.width}px` })
      }
      el.showPopover()
    } else if (!open && el.matches(':popover-open')) el.hidePopover()
  }, [open])
  useEffect(() => { setActive(-1) }, [typed, all])
  useEffect(() => {
    list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const pick = (t: string) => {
    onChange(t)
    setOpen(false)
    setAll(false)
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) { setOpen(true); return }
      const n = shown.length
      setActive(i => e.key === 'ArrowDown' ? (i + 1) % n : (i <= 0 ? n - 1 : i - 1))
    } else if (e.key === 'Enter' && open && active >= 0) {
      e.preventDefault()
      pick(shown[active])
    } else if (e.key === 'Enter' && singleLine) {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'Escape' && open) {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div ref={box} className="relative" style={{ anchorName: anchor } as React.CSSProperties}>
      {(() => {
        const field = {
          value,
          placeholder,
          'aria-invalid': invalid || undefined,
          role: 'combobox',
          'aria-expanded': open,
          'aria-controls': id,
          'aria-autocomplete': 'list' as const,
          'aria-activedescendant': open && active >= 0 ? `${id}-${active}` : undefined,
          onFocus: () => (inSheet ? openScreen() : setOpen(true)),
          onBlur: () => { setOpen(false); setAll(false) },
          onKeyDown,
          readOnly: inSheet || undefined,
        }
        const change = (v: string) => { onChange(singleLine || truncate ? v.replace(/\s*\n\s*/g, ' ') : v); setAll(false); setOpen(true) }
        // An input, as a textarea can't end in an ellipsis
        return truncate
          ? <input {...field} onChange={e => change(e.target.value)} className={`${areaClass} h-10 in-[[data-sheet]]:h-12! truncate pr-10 focus:ring-1 focus:ring-inset focus:ring-black/40`} />
          : <TextArea {...field} invalid={invalid} onChange={change} className="pr-10" />
      })()}
      <button
        type="button"
        tabIndex={-1}
        aria-label={label}
        onMouseDown={e => e.preventDefault()}
        onClick={() => { if (inSheet) { setAll(true); openScreen(); return } box.current?.querySelector<HTMLElement>('textarea, input')?.focus(); setAll(true); setOpen(o => !o || !all) }}
        className="absolute top-0 right-0 flex size-10 in-[[data-sheet]]:h-12! cursor-pointer items-center justify-center"
      >
        <ChevronIcon />
      </button>
      <div
        ref={list}
        id={id}
        popover="manual"
        role="listbox"
        aria-label={label}
        onMouseDown={e => e.preventDefault()}
        // White, 2 px inside its edge, a soft shadow and no line; rows 8 px round, the pointed one grey, the picked one
        // medium with a tick (Figma 5015:11234)
        className="max-h-[288px] overflow-y-auto rounded-[8px] bg-white p-[2px] text-[14px] leading-5 text-black shadow-[0_10px_15px_rgba(0,0,0,0.1)]"
        // The popover's own styles centre it on the screen (inset 0, margin auto): undone here, then put under the field
        style={{
          position: 'fixed',
          inset: 'auto',
          margin: 0,
          ...(ANCHOR ? { positionAnchor: anchor, top: 'calc(anchor(bottom) + 8px)', left: 'anchor(left)', width: 'anchor-size(width)' } : {}),
        } as React.CSSProperties}
      >
        {shown.map((t, i) => (
          <div
            key={t}
            id={`${id}-${i}`}
            data-i={i}
            role="option"
            aria-selected={t === hit}
            onMouseEnter={() => setActive(i)}
            onClick={() => pick(t)}
            className={`flex cursor-pointer items-start gap-2 rounded-[8px] px-3 py-[10px] ${i === active ? 'bg-[#f5f5f5]' : ''} ${t === hit ? 'font-medium' : ''}`}
          >
            <span className="min-w-0 flex-1">{shownAs(t).replace('\n', ' ')}</span>
            {t === hit && <span className="flex h-5 w-4 shrink-0 items-center justify-center"><Tick /></span>}
          </div>
        ))}
      </div>
      {screen && layer.el && createPortal(
        <div role="dialog" aria-label={label} data-combo className="absolute inset-0 flex flex-col bg-white font-sans text-black" style={{ paddingBottom: layer.hidden }}>
          {/* «Готово» in the field, where the closed one has its chevron (it stood after the field) */}
          <div ref={screenField} className="relative shrink-0 px-6 pt-6 pb-2">
            <TextArea
              value={value}
              placeholder={placeholder}
              aria-invalid={invalid || undefined}
              enterKeyHint="done"
              onChange={v => { onChange(singleLine || truncate ? v.replace(/\s*\n\s*/g, ' ') : v); setAll(false) }}
              onKeyDown={e => { if ((e.key === 'Enter' && singleLine) || e.key === 'Escape') { e.preventDefault(); closeScreen() } }}
              className="pr-[68px]"
            />
            <button type="button" onClick={closeScreen} className="absolute top-6 right-6 h-10 in-[[data-sheet]]:h-12 cursor-pointer px-3 text-[14px] leading-5 font-medium">Готово</button>
          </div>
          {/* Rows across the screen, as a native list, the picked one medium with a tick; their text in line with the field's,
              the tick under «Готово» */}
          <div role="listbox" aria-label={label} className="min-h-0 flex-1 overflow-y-auto px-6 pb-[calc(24px+env(safe-area-inset-bottom))] text-[14px] leading-5">
            {shown.map(t => (
              <div
                key={t}
                role="option"
                aria-selected={t === hit}
                onClick={() => { pick(t); closeScreen() }}
                className={`flex cursor-pointer items-start gap-2 rounded-[8px] px-3 py-3 active:bg-[#f5f5f5] ${t === hit ? 'font-medium' : ''}`}
              >
                <span className="min-w-0 flex-1">{shownAs(t).replace('\n', ' ')}</span>
                {t === hit && <span className="flex h-5 w-4 shrink-0 items-center justify-center"><Tick /></span>}
              </div>
            ))}
          </div>
        </div>,
        layer.el,
      )}
    </div>
  )
}

/**
 * The QR link field: a one-line-tall textarea that grows with the link instead of cutting it off. Links have no
 * spaces, so they break anywhere; Enter and pasted line breaks never get into the value. Adds https:// on blur and
 * shows whether the link is fine.
 */
export function UrlField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [blurred, setBlurred] = useState(false)
  const ref = useAutoHeight(value)
  const valid = isValidUrl(value.trim())
  const error = blurred && value.trim() !== '' && !valid
  return (
    <div className="relative">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={e => { onChange(e.target.value.replace(/\s*\n\s*/g, '')); setBlurred(false) }}
        onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
        onBlur={() => {
          setBlurred(true)
          const v = value.trim()
          if (v && !/^https?:\/\//i.test(v)) { onChange('https://' + v); setBlurred(false) }
        }}
        placeholder="https://..."
        aria-invalid={error || undefined}
        spellCheck={false}
        className={`${areaClass} break-all pr-9 focus:ring-1 focus:ring-inset focus:ring-black/40`}
      />
      {/* On the first line, however many lines the link takes */}
      <div className="pointer-events-none absolute top-0 right-0 flex h-10 in-[[data-sheet]]:h-12! w-9 items-center justify-center">
        {valid ? (
          <span role="img" aria-label="Ссылка в порядке"><Tick color="#00C950" /></span>
        ) : error ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-label="Проверьте ссылку">
            <circle cx="7" cy="7" r="6" stroke="#e30" strokeWidth="1.4" />
            <line x1="7" y1="4" x2="7" y2="7.5" stroke="#e30" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="7" cy="9.5" r="0.7" fill="#e30" />
          </svg>
        ) : null}
      </div>
    </div>
  )
}

/** A grey 16 px box with a black tick, 8 px from its label (Figma: UMO | Evrone, node 4900:4656), on a native checkbox for keyboard and screen readers */
export function Checkbox({ checked, onChange, children, className = '' }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode; className?: string }) {
  return (
    // In the phone's sheet the row takes a finger's 48 px, 16 px over and under it given back by margins, so it looks as before
    <label className={`flex cursor-pointer items-center gap-2 text-[14px] leading-4 text-black in-[[data-sheet]]:-my-4 in-[[data-sheet]]:py-4 ${className}`}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className="flex size-4 shrink-0 items-center justify-center rounded-[4px] bg-[#f5f5f5] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-black/30">
        {checked && <Tick />}
      </span>
      {children}
    </label>
  )
}

/** A part that can be left out: its checkbox is the label, and the field shows only while it's on; `extra` sits at the end of the label row */
export function OptionalField({ label, on, onChange, extra, children }: { label: string; on: boolean; onChange: (v: boolean) => void; extra?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="group/field flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Checkbox checked={on} onChange={onChange} className={ALERT_LABEL}>{label}</Checkbox>
        {on && extra}
      </div>
      {on && children}
    </div>
  )
}

// Grey #808080, black on hover, the icon with it (Figma 5017:11279)
export const rowAction = 'flex shrink-0 cursor-pointer items-center gap-2 text-[14px] leading-4 text-[#808080] transition-colors hover:text-black'

/** Corners for the size switch, on the 16 grid with the ticks' 2 px stroke and square ends: at the outer corners to grow, turned in to shrink */
function SizeIcon({ grow }: { grow: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="bevel" aria-hidden>
      {grow
        ? <path d="M9 3H13V7M7 13H3V9" />
        : <path d="M13 7H9V3M3 9H7V13" />}
    </svg>
  )
}

/**
 * Size at the end of a field's label row (Figma: UMO | Evrone, node 4900:4662), the same words for the text and the QR,
 * naming what a press does: «Крупнее» while it's small, «Мельче» once it's large, each followed by its corners. Shown only where
 * the other size is available.
 */
export function SizeSwitch({ large, onChange, label }: { large: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!large)}
      aria-pressed={large}
      aria-label={label}
      className={rowAction}
    >
      {large ? 'Мельче' : 'Крупнее'}
      <SizeIcon grow={!large} />
    </button>
  )
}

// Edged at 10%, at 40% on hover (Figma 5015:11171)
export const outlined = 'flex min-w-16 flex-1 items-center justify-center rounded-[8px] border border-black/10 px-3 py-[9px] in-[[data-sheet]]:py-[13px]! text-[14px] font-medium leading-5 text-black cursor-pointer hover:border-black/40 disabled:cursor-default disabled:text-[#999] disabled:hover:border-black/10'

/** A word the download bar's line says for a moment («В файле нет режимника») */
const flashes = new Set<(text: string) => void>()
/** Says something for two seconds over the download, where the line saying what's in the way stands */
export const flash = (text: string) => flashes.forEach(f => f(text))

/**
 * «Поделиться» (Figma 4939:3762): sends a link to the file, `pdf=1` added to the page address (the settings are in it),
 * as it's mostly sent to a dealer, who wants the file, not the editor; with Alt (Option) held the address as it is, the
 * editor with these settings, for the team, the button saying «Ссылка на редактор» while Alt is down. On phones through
 * the system's share sheet, elsewhere copied, the button itself saying what was copied for two seconds. Off while the
 * result isn't ready (`incomplete`, as «Скачать»): a link is sent for what it makes, not a draft. «Сбросить» stood beside
 * it until resets moved onto the canvas, by what they reset
 */
/**
 * Sends the link: on phones through the system's share sheet (the chat a link goes to in a tap or two, «Скопировать»
 * among them), elsewhere copied, `onCopied` saying so; the file's link is the address with `pdf=1` added
 */
async function shareLink(editor: boolean, onCopied: () => void) {
  const here = window.location.href.replace(/#.*/, '')
  const url = editor ? here : `${here}${here.includes('?') ? '&' : '?'}pdf=1`
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ url })
      goal('copy_link', { page: location.pathname, shared: true, pdf: !editor })
    } catch { /* closed without sending */ }
    return
  }
  await navigator.clipboard.writeText(url)
  onCopied()
  goal('copy_link', { page: location.pathname, pdf: !editor })
}

/** Whether the browser sends files through the share sheet (phones, Safari, Chrome; not Firefox) */
export const canShareFiles = (() => {
  try { return !!navigator.canShare?.({ files: [new File([''], 'x.pdf', { type: 'application/pdf' })] }) } catch { return false }
})()

/** The files the browser takes for the share sheet: all of them, else the first alone (the PDF) */
const sendable = (files: File[]) => (navigator.canShare({ files }) ? files : navigator.canShare({ files: [files[0]] }) ? [files[0]] : null)

/**
 * The file itself where the browser can send one (phones, Safari, Chrome): made ahead, a moment after the settings
 * last changed, as the share sheet opens only straight from the click (Safari refused it after the second the PDF
 * takes); none while it's being made or can't be sent (a ZIP), when the link goes as before
 */
function useReadyFile(make: (() => Promise<File | File[]>) | undefined, off: boolean) {
  const [files, setFiles] = useState<File[] | null>(null)
  useEffect(() => {
    setFiles(null)
    if (!make || off || !canShareFiles) return
    let gone = false
    const t = setTimeout(() => make().then(f => { if (!gone) setFiles(sendable([f].flat())) }).catch(() => {}), 400)
    return () => { gone = true; clearTimeout(t) }
  }, [make, off])
  return files
}

export function LinkButtons({ incomplete, file: make, fileOnly }: {
  incomplete?: boolean
  /** The file (or files) to send instead of its link, where the browser can */
  file?: () => Promise<File | File[]>
  /**
   * The file and never a link (name tag, business card, price tag: a list in the address made a link of kilobytes);
   * the page shows the button only where `canShareFiles`. Pressed before the file is ready, it's made then, which
   * Chrome sends and Safari may refuse
   */
  fileOnly?: boolean
}) {
  const file = useReadyFile(make, !!incomplete)
  const [copied, setCopied] = useState<'file' | 'editor' | null>(null)
  const [alt, setAlt] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(null), 2000)
    return () => clearTimeout(t)
  }, [copied])
  useEffect(() => {
    const key = (e: KeyboardEvent) => setAlt(e.altKey)
    const off = () => setAlt(false)
    window.addEventListener('keydown', key)
    window.addEventListener('keyup', key)
    window.addEventListener('blur', off)
    return () => {
      window.removeEventListener('keydown', key)
      window.removeEventListener('keyup', key)
      window.removeEventListener('blur', off)
    }
  }, [])
  const share = (e: React.MouseEvent) => {
    if (copied) return
    const editor = e.altKey && !fileOnly
    if (!editor && (file || fileOnly)) {
      ;(file ? Promise.resolve(file) : make!().then(f => sendable([f].flat())))
        .then(files => files && navigator.share({ files, title: files[0].name }))
        .then(sent => sent !== null && goal('copy_link', { page: location.pathname, shared: true, pdf: true, file: true }))
        .catch(() => { /* closed without sending */ })
      return
    }
    shareLink(editor, () => setCopied(editor ? 'editor' : 'file'))
  }
  return (
    // White under it: on phones it stands over the canvas, and there its stroke is centred on its edge, half out, half
    // in (a trial): inside, the stroke left 38 px of white beside the solid 40 of the download, which read larger. Wide
    // screens keep the inside stroke
    <button type="button" onClick={share} title={alt && !fileOnly ? 'Отправить ссылку на редактор с этими настройками' : file || fileOnly ? 'Отправить файл' : 'Отправить ссылку на файл'} disabled={incomplete} aria-disabled={copied ? true : undefined} className={`${outlined} w-full bg-white ${copied ? 'cursor-default hover:border-black/10! max-md:hover:shadow-[0_0_0_0.5px_rgba(0,0,0,0.1),inset_0_0_0_0.5px_rgba(0,0,0,0.1)]!' : ''} max-md:border-0 max-md:py-[10px] max-md:in-[[data-sheet]]:py-[14px]! max-md:shadow-[0_0_0_0.5px_rgba(0,0,0,0.1),inset_0_0_0_0.5px_rgba(0,0,0,0.1)] max-md:hover:shadow-[0_0_0_0.5px_rgba(0,0,0,0.4),inset_0_0_0_0.5px_rgba(0,0,0,0.4)] max-md:disabled:hover:shadow-[0_0_0_0.5px_rgba(0,0,0,0.1),inset_0_0_0_0.5px_rgba(0,0,0,0.1)]`}>
      {/* Regular, as a note rather than a button's name; while it shows the button is still, no hover or click, its text grey #808080, as quiet lines: the hover's edge is overridden, as
          pointer-events: none kept the browser's hover on until the pointer moved */}
      {copied
        ? <span className="font-normal text-[#808080]">{copied === 'editor' ? 'Ссылка на редактор скопирована' : 'Ссылка на файл скопирована'}</span>
        : alt && !fileOnly ? 'Ссылка на редактор' : 'Поделиться'}
    </button>
  )
}

/**
 * The empty fields said in the download button, in the form's order, as what to do there, in the infinitive, a
 * button's verb («Выбрать дилера», «Указать цену»), going on as they're filled in. A wholly empty form says its first
 * field too: it's the first step (it said «Не хватает данных» while the fields were said as states, «Дилер не выбран»;
 * then every one was «Нужно …», then imperative, «Добавьте…», then the first with «Нужно» for the context)
 */
export const unfilled = (said: string[]) => said[0]

/**
 * Which item the note over the download is about, after it: «3/8», its number (as beside it in the list) of all; none
 * for one item or a note about what they share (the dealer). It was «1/5», the first of all the empty and wrong fields
 * left, which never moved on and read as a stuck progress
 */
export const itemOf = (index: number, total: number) => (total > 1 && index >= 0 ? `${index + 1}/${total}` : undefined)

/**
 * The download, at the foot of the sidebar (in the phone's sheet): one black button saying the next step while
 * something's in the way («Указать имя 3/8», «Цена слишком низкая») and leading there, «Скачать PDF» once nothing
 * is. It was always «Скачать», greyed out, with a secondary button over it saying the step (and before that a black
 * line, under the button for a while)
 */
export function DownloadBar({ format, onClick, busy, disabled, note, count, onNote, links }: {
  format: 'PDF' | 'ZIP'
  onClick: () => void
  busy: boolean
  disabled?: boolean
  note?: string
  /** «3/8» after the note, grey: the item it's about (`itemOf`) */
  count?: string
  onNote?: () => void
  /** «Поделиться», right over the download: off with it, the line over them speaking for both */
  links?: React.ReactNode
}) {
  // What a button under the line has just done, said there for two seconds
  const [said, setSaid] = useState('')
  useEffect(() => {
    const f = (text: string) => setSaid(text)
    flashes.add(f)
    return () => { flashes.delete(f) }
  }, [])
  useEffect(() => {
    if (!said) return
    const t = setTimeout(() => setSaid(''), 2000)
    return () => clearTimeout(t)
  }, [said])
  // One button, in the phone's sheet (Figma 5098:5806) and on wide screens alike: while the download is off, what's in
  // the way and in which item («Указать имя 3/8»), leading there (the phone's sheet opening first); else the
  // download, «Поделиться» with it. The bright button stays the next step, so it's pressed even unread, and the press
  // teaches what to do (on wide screens a secondary button saying the step stood over a greyed-out download)
  const foot = useContext(InFoot)
  // ⌘S presses it, as «Скачать» or the step in the way (the browser would save the page's HTML); the first bar to hear
  // it takes it, should a page hold two
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!withMod(e, 'KeyS') || e.defaultPrevented) return
      e.preventDefault()
      button.current?.click()
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [])
  const lead = disabled && !!note && !said
  const leads = lead && !!onNote
  const shareOn = !!links && !disabled && !said
  const main = (
    <button
      ref={button}
      type="button"
      title={lead || busy || said ? undefined : `Скачать ${format} ${MOD}S`}
      aria-keyshortcuts={MOD === '⌘' ? 'Meta+S' : 'Control+S'}
      // The field focused in the tap itself: iOS raises the keyboard only for a focus within the gesture (it was 350 ms later,
      // after the sheet opened, and the field only lit up)
      onClick={leads ? () => { foot?.(); onNote!() } : onClick}
      disabled={busy || (disabled && !leads)}
      className={`flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-black px-3 py-[10px] in-[[data-sheet]]:py-[14px]! text-[14px] leading-5 hover:enabled:bg-[#333] disabled:cursor-default
        ${lead || said ? 'font-normal' : 'font-medium'} ${disabled && !leads && !busy ? 'text-[#999]' : 'text-white'}`}
    >
      {busy && (
        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" aria-hidden>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      )}
      {said || (lead
        ? <>{note}{count && <span className="text-white/50">{count}</span>}</>
        : busy ? 'Генерация…' : `Скачать ${format}`)}
    </button>
  )
  // Phones: «Поделиться» right of the download, half each, once the download is on (tried: an icon left of the
  // download, «Поделиться» left of it, as wide as its word on the right)
  if (foot) return (
    <div className="grid auto-cols-fr grid-flow-col gap-2">
      {main}
      {shareOn && <div className="flex min-w-0">{links}</div>}
    </div>
  )
  // Wide screens: as far off the form as before (8 + 24 px), sticking to the sidebar's foot on the phones' gradients (`FOOT_BG`), 24 px in
  // all round, as on phones (Figma 5098:5539); «Поделиться» over the download, as wide, so it has room to say the link
  // is copied
  return (
    <div style={{ background: FOOT_BG }} className="sticky bottom-0 z-10 mt-2 flex flex-col gap-2 p-6 tracking-normal">
      {shareOn && <div className="flex">{links}</div>}
      <div className="flex">{main}</div>
    </div>
  )
}
