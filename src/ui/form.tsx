import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { goal } from './metrika'

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

/** In alphabetical order, as the switcher lists them */
const GENERATORS = [
  { path: '/name-tag', title: 'Бейдж' },
  { path: '/business-card', title: 'Визитка' },
  { path: '/livery', title: 'Ливрея' },
  { path: '/price-card', title: 'Прайс-карта' },
  { path: '/plate-frame', title: 'Рамка номера' },
]

/**
 * The top of a generator's sidebar (Figma 4900:4589, the switch and its hover 5008:10784): breadcrumbs back to the guide and to its
 * Носители chapter, and the generators in one line, a ring: the current one black where the title always stood, 24 px
 * from the panel's edge, the others grey after it in the list's order, going round and running out under the panel's
 * right edge. The line turns with the wheel (either way) or a drag, and comes back round to the current one when left;
 * a click turns the picked one into the title's place, then opens it.
 */
/** The header's links underline on hover as the guide's do (Figma 4865:1061): black at 40%, fading out */
const crumb = 'underline decoration-transparent decoration-[2.5%] underline-offset-[25%] [text-decoration-skip-ink:none] transition-[text-decoration-color] duration-250 hover:decoration-black/40 hover:duration-0'

export function GeneratorHeader({ current }: { current: '/price-card' | '/livery' | '/plate-frame' | '/name-tag' | '/business-card' }) {
  return (
    <div className="flex flex-col gap-4">
      <nav className="flex items-center gap-2 text-[14px] font-medium leading-5 tracking-normal [font-feature-settings:'case'_1]">
        <Link to="/" className={crumb}>Бренд UMO</Link>
        <span aria-hidden>·</span>
        <Link to="/#materials" className={crumb}>Носители</Link>
      </nav>
      <GeneratorRing current={current} />
    </div>
  )
}

/** Where the current generator stands, the panel's padding */
const RING_START = 24
const RING_TURN_MS = 300

function GeneratorRing({ current }: { current: string }) {
  const navigate = useNavigate()
  const at = GENERATORS.findIndex(g => g.path === current)
  const ring = [...GENERATORS.slice(at), ...GENERATORS.slice(0, at)]
  const rowRef = useRef<HTMLDivElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  // One turn of the ring in px (the names with a 24 px gap after each), and how far it's turned, unbounded
  const [turn, setTurn] = useState(0)
  const [offset, setOffset] = useState(0)
  const [eased, setEased] = useState(false)
  const offsetRef = useRef(0)
  const hover = useRef(false)
  const timer = useRef<number>(0)
  const glide = useRef(0)
  const drag = useRef<{ x: number; start: number; moved: boolean; t: number; v: number } | null>(null)
  const dragged = useRef(false)
  const still = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useLayoutEffect(() => {
    const measure = () => copyRef.current && setTurn(copyRef.current.offsetWidth)
    measure()
    document.fonts?.ready.then(measure)
  }, [])

  const move = (to: number, ease: boolean) => {
    offsetRef.current = to
    setEased(ease && !still)
    setOffset(to)
  }
  // Back round to the current one, the shorter way
  const settle = () => {
    if (!turn) return
    const home = Math.round(offsetRef.current / turn) * turn
    if (home !== offsetRef.current) move(home, true)
  }
  const later = (ms: number) => {
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => (hover.current ? later(ms) : settle()), ms)
  }
  useEffect(() => () => { clearTimeout(timer.current); cancelAnimationFrame(glide.current) }, [])

  // The wheel turns the line either way; a passive listener couldn't keep the page from scrolling
  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    const wheel = (e: WheelEvent) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (!d) return
      e.preventDefault()
      cancelAnimationFrame(glide.current)
      move(offsetRef.current + d * (e.deltaMode === 1 ? 16 : 1), false)
      later(1500)
    }
    row.addEventListener('wheel', wheel, { passive: false })
    return () => row.removeEventListener('wheel', wheel)
  })

  const down = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    cancelAnimationFrame(glide.current)
    clearTimeout(timer.current)
    drag.current = { x: e.clientX, start: offsetRef.current, moved: false, t: e.timeStamp, v: 0 }
    dragged.current = false
  }
  const pointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    if (!d.moved && Math.abs(dx) < 5) return
    if (!d.moved) {
      d.moved = true
      dragged.current = true
      rowRef.current?.setPointerCapture(e.pointerId)
    }
    const to = d.start - dx
    const dt = e.timeStamp - d.t
    if (dt > 0) d.v = (to - offsetRef.current) / dt
    d.t = e.timeStamp
    move(to, false)
  }
  const up = () => {
    const d = drag.current
    drag.current = null
    if (!d?.moved) return
    // Let it run on a little, slowing down, then come back round after a while
    let v = still ? 0 : d.v
    let last = performance.now()
    const step = (now: number) => {
      const dt = now - last
      last = now
      move(offsetRef.current + v * dt, false)
      v *= Math.pow(0.995, dt)
      if (Math.abs(v) > 0.02) glide.current = requestAnimationFrame(step)
      else later(2000)
    }
    glide.current = requestAnimationFrame(step)
  }

  const open = (e: React.MouseEvent, k: number, i: number, path: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    if (dragged.current && e.detail) return
    const item = copyRef.current?.children[i] as HTMLElement | undefined
    if (still || !item) return navigate(path)
    clearTimeout(timer.current)
    cancelAnimationFrame(glide.current)
    move(k * turn + item.offsetLeft, true)
    window.setTimeout(() => navigate(path), RING_TURN_MS)
  }

  // Enough turns of the ring around where it stands to fill the line, also while it eases between two places
  const base = turn ? Math.floor(offset / turn) : 0
  const turns = turn ? [base - 2, base - 1, base, base + 1, base + 2] : [0]
  const name = 'text-[24px] font-medium leading-6 tracking-[-0.01em] whitespace-nowrap'

  return (
    <div
      ref={rowRef}
      className="relative -mx-6 h-6 cursor-default touch-pan-y select-none overflow-x-clip"
      onPointerEnter={() => { hover.current = true }}
      onPointerLeave={() => { hover.current = false; later(400) }}
      onPointerDown={down}
      onPointerMove={pointerMove}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <nav
        aria-label="Конструкторы"
        className="absolute inset-y-0 left-0"
        style={{ transform: `translateX(${RING_START - offset}px)`, transition: eased ? `transform ${RING_TURN_MS}ms cubic-bezier(.3,0,0,1)` : undefined }}
        onTransitionEnd={() => setEased(false)}
      >
        {turns.map(k => (
          <div key={k} ref={k === 0 ? copyRef : undefined} aria-hidden={k !== 0} className="absolute top-0 flex" style={{ left: k * turn }}>
            {ring.map((g, i) => i === 0 && k === 0
              ? <h1 key={g.path} className={`${name} pr-6`}>{g.title}</h1>
              : <Link
                  key={g.path}
                  to={g.path}
                  tabIndex={k === 0 ? undefined : -1}
                  draggable={false}
                  onClick={e => open(e, k, i, g.path)}
                  className={`${name} mr-6 ${i === 0 ? 'text-black' : 'text-[#bfbfbf]'} ${crumb} outline-none hover:text-black focus-visible:text-black focus-visible:decoration-black/40`}
                >{g.title}</Link>)}
          </div>
        ))}
      </nav>
      {/* The shades over the panel's edges (Figma 5062:671, 5061:539): two layers each, as set there, the left one solid for its outer quarter */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-6" style={{ background: 'linear-gradient(90deg, #ffffff80 25%, #fff0), linear-gradient(90deg, #fff 25%, #fff0)' }} />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-12" style={{ background: 'linear-gradient(90deg, #fff0, #ffffff80), linear-gradient(90deg, #fff0, #fff)' }} />
    </div>
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
      className={`flex-1 min-w-0 flex items-center justify-center rounded-[8px] border px-3 py-[9px] cursor-pointer outline-none
        focus-visible:ring-2 focus-visible:ring-black/30 disabled:cursor-not-allowed disabled:opacity-40
        ${active ? 'border-black/10 bg-white text-black' : 'border-transparent text-[#808080]'}`}
    >
      <span className="font-medium text-[14px] leading-5 whitespace-nowrap">{children}</span>
    </button>
  )
}

// Spacing per Figma (UMO | Evrone, node 4900:4595): 8 px from a label to its control, 16 px between groups — the gap
// of the column the groups sit in.

/**
 * A field with an error isn't edged in red: its label turns red instead, found by the control's aria-invalid under it
 * (`ALERT_LABEL` on the label, `group/field` on what holds both), so every generator's fields do it with nothing passed
 */
export const ALERT_LABEL = 'group-has-[[aria-invalid=true]]/field:text-[#e30]'

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group/field flex flex-col gap-2">
      <p className={`text-[14px] leading-5 text-[#999] whitespace-nowrap ${ALERT_LABEL}`}>{label}</p>
      {children}
    </div>
  )
}

export function Segments({ children }: { children: React.ReactNode }) {
  // The picked one a white tile edged at 10% on the grey, the others grey text; no hover (Figma 5015:11137)
  return <div className="flex rounded-[8px] bg-[#f5f5f5]">{children}</div>
}

export function TextInput({ value, onChange, onBlur, onPaste, placeholder, invalid, numeric, inputMode, list, className = '' }: { value: string; onChange: (v: string) => void; onBlur?: () => void; onPaste?: (e: React.ClipboardEvent) => void; placeholder?: string; invalid?: boolean; numeric?: boolean; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; list?: string; className?: string }) {
  return (
    <input
      value={value}
      list={list}
      onChange={e => onChange(e.target.value)}
      onBlur={() => onBlur?.()}
      onPaste={onPaste}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      inputMode={inputMode ?? (numeric ? 'numeric' : undefined)}
      pattern={numeric ? '[0-9 ]*' : undefined}
      className={`h-10 w-full min-w-0 rounded-[8px] bg-[#f5f5f5] px-3 text-[14px] leading-5 text-black outline-none placeholder:text-[#999]
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

const areaClass = 'block min-h-10 w-full min-w-0 resize-none overflow-hidden rounded-[8px] bg-[#f5f5f5] py-[10px] px-3 text-[14px] leading-5 text-black outline-none placeholder:text-[#999]'

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
export function ComboField({ value, onChange, options, placeholder, label, invalid, singleLine, shownAs = t => t }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; label: string; invalid?: boolean; /** Enter doesn't break the line, pasted breaks become spaces */ singleLine?: boolean; /** How an option reads in the list, when it differs from the value it gives */ shownAs?: (t: string) => string }) {
  const box = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [all, setAll] = useState(false)
  const [active, setActive] = useState(-1)
  const typed = value.replace(/\s+/g, ' ').trim().toLowerCase()
  const hit = options.find(t => oneLine(t) === typed)
  const matching = options.filter(t => oneLine(t).includes(typed))
  const shown = all || !typed || hit || !matching.length ? options : matching
  const id = useId()
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
      <TextArea
        value={value}
        onChange={v => { onChange(singleLine ? v.replace(/\s*\n\s*/g, ' ') : v); setAll(false); setOpen(true) }}
        placeholder={placeholder}
        invalid={invalid}
        className="pr-10"
        role="combobox"
        aria-expanded={open}
        aria-controls={id}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => { setOpen(false); setAll(false) }}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={label}
        onMouseDown={e => e.preventDefault()}
        onClick={() => { box.current?.querySelector('textarea')?.focus(); setAll(true); setOpen(o => !o || !all) }}
        className="absolute top-0 right-0 flex size-10 cursor-pointer items-center justify-center"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M3 5L7 9L11 5" stroke="black" strokeWidth="2" strokeLinecap="square" strokeLinejoin="bevel" />
        </svg>
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
      <div className="pointer-events-none absolute top-0 right-0 flex h-10 w-9 items-center justify-center">
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
    <label className={`flex cursor-pointer items-center gap-2 text-[14px] leading-5 text-black ${className}`}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className="flex size-4 shrink-0 items-center justify-center rounded-[2px] bg-[#f5f5f5] peer-focus-visible:ring-2 peer-focus-visible:ring-black/30">
        {checked && <Tick />}
      </span>
      {children}
    </label>
  )
}

/** A part that can be left out: its checkbox is the label, and the field shows only while it's on; `extra` sits at the end of the label row */
export function OptionalField({ label, on, onChange, extra, children }: { label: string; on: boolean; onChange: (v: boolean) => void; extra?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="group/field flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Checkbox checked={on} onChange={onChange} className={ALERT_LABEL}>{label}</Checkbox>
        {on && extra}
      </div>
      {on && children}
    </div>
  )
}

// Grey #808080, black on hover, the icon with it (Figma 5017:11279)
export const rowAction = 'flex shrink-0 cursor-pointer items-center gap-2 text-[14px] leading-5 text-[#808080] outline-none transition-colors hover:text-black focus-visible:ring-2 focus-visible:ring-black/30'

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
export const outlined = 'flex min-w-16 flex-1 items-center justify-center rounded-[8px] border border-black/10 px-3 py-[9px] text-[14px] font-medium leading-5 text-black cursor-pointer outline-none hover:border-black/40 focus-visible:ring-2 focus-visible:ring-black/30'

/**
 * «Копировать» and «Сбросить» side by side (Figma 4939:3762): the first copies the page address — the settings are in
 * it — to send a set-up card or livery as a link, and says so for two seconds; the second brings the settings back to
 * the defaults, which a page reload can't, as the address keeps them.
 */
export function LinkButtons({ onReset }: { onReset: () => void }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(window.location.href).then(() => {
          setCopied(true)
          goal('copy_link', { page: location.pathname })
        })}
        title="Скопировать ссылку на эти настройки"
        className={outlined}
      >
        <span aria-live="polite">{copied ? 'Скопировано' : 'Копировать'}</span>
      </button>
      <button type="button" onClick={onReset} title="Вернуть настройки по умолчанию" className={outlined}>Сбросить</button>
    </div>
  )
}

export function DownloadButton({ onClick, busy, disabled, children }: { onClick: () => void; busy: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className="flex w-full min-w-16 items-center justify-center gap-2 rounded-[8px] bg-black px-3 py-[10px] text-[14px] font-medium leading-5 text-white cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-[#333]"
    >
      {busy && (
        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" aria-hidden>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      )}
      {busy ? 'Генерация…' : children}
    </button>
  )
}
