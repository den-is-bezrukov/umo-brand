import { useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { goal } from './metrika'
import { InFoot, InSheet, SheetSize } from './phone'

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

/** In alphabetical order, as the ring lists them */
const GENERATORS = [
  { path: '/name-tag', title: 'Бейдж' },
  { path: '/business-card', title: 'Визитка' },
  { path: '/livery', title: 'Ливрея' },
  { path: '/price-card', title: 'Прайс-карта' },
  { path: '/plate-frame', title: 'Рамка номера' },
  { path: '/hours-sign', title: 'Режимник' },
  { path: '/price-tag', title: 'Ценник' },
]

/**
 * The breadcrumbs underline on hover as the guide's links do (Figma 4865:1061): black at 40%, fading out, 0.35 px (2.5%
 * of their 14 px). The generators' names don't: they are navigation, as the guide's contents, and only darken
 */
const crumb = 'underline decoration-transparent decoration-[0.35px] underline-offset-[25%] [text-decoration-skip-ink:none] transition-[text-decoration-color] duration-250 hover:decoration-black/40 hover:duration-0'

/**
 * The top of a generator's form, the same on every screen (Figma 5098:5487, the phone's, carried over to wide screens):
 * the menu icon and the breadcrumbs in Regular, 16 px tall, the icon opening every generator (on a phone a sheet of its
 * own, 5099:5825, elsewhere a list under it); on a phone the size icon across from them opening the form over the whole
 * screen or putting it back; the generators' line under them (`GeneratorRing`). Wide screens had the crumbs in Medium
 * with a list under «Носители ⌄» and a ring turned by script, which a finger couldn't drive
 */
export function GeneratorHeader({ current }: { current: '/price-card' | '/livery' | '/plate-frame' | '/name-tag' | '/business-card' | '/price-tag' | '/hours-sign' }) {
  const inSheet = useContext(InSheet)
  const size = useContext(SheetSize)
  const [menu, setMenu] = useState(false)
  const openMenu = () => { setMenu(m => !m); if (!menu) goal('open_menu', { page: location.pathname }) }
  return (
    <>
      <div data-head className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span data-generator-menu className="relative flex">
            <IconButton label="Конструкторы" onClick={openMenu} d="M2 4H14M2 8H14M2 12H14" />
            {menu && !inSheet && <GeneratorList current={current} onClose={() => setMenu(false)} />}
          </span>
          <PhoneCrumbs />
          {/* Grey, as the canvas's icons; it turns inward while the form is over the whole screen */}
          {size && <IconButton label={size.full ? 'Свернуть форму' : 'Развернуть форму'} onClick={size.toggle} grey d={size.full ? 'M13 7H9V3M3 9H7V13' : 'M9 3H13V7M7 13H3V9'} />}
        </div>
        <GeneratorRing current={current} />
      </div>
      {menu && inSheet && createPortal(<GeneratorMenu current={current} height={inSheet} onClose={() => setMenu(false)} />, document.body)}
    </>
  )
}

/**
 * The menu icon's list on wide screens: every generator in its order, the current one medium with a tick right after
 * it, styled as the combobox's suggestions (Figma 5015:11234; it was the list under «Носители ⌄»), 8 px under the icon,
 * as wide as its longest row; Esc or a click elsewhere closes it
 */
function GeneratorList({ current, onClose }: { current: string; onClose: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const away = (e: PointerEvent) => { if (!(e.target as Element).closest('[data-generator-menu]')) onClose() }
    document.addEventListener('keydown', key)
    document.addEventListener('pointerdown', away)
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', away) }
  }, [onClose])
  return (
    <nav aria-label="Конструкторы" className="absolute top-full -left-[14px] z-20 mt-2 w-max rounded-[8px] bg-white p-[2px] text-[14px] leading-5 whitespace-nowrap text-black shadow-[0_10px_15px_rgba(0,0,0,0.1)]">
      {GENERATORS.map(g => g.path === current ? (
        <div key={g.path} aria-current="page" className="flex items-center gap-2 rounded-[8px] px-3 py-[10px] font-medium">
          {g.title}
          <span className="flex h-5 w-4 shrink-0 items-center justify-center"><Tick /></span>
        </div>
      ) : (
        <Link key={g.path} to={g.path} onClick={onClose} className="flex rounded-[8px] px-3 py-[10px] outline-none hover:bg-[#f5f5f5] focus-visible:bg-[#f5f5f5]">{g.title}</Link>
      ))}
    </nav>
  )
}

/** The generators' menu on a phone (Figma 5099:5825), a sheet over the form's: the breadcrumbs with «Свернуть» across from them, then every generator, 24 px Medium 20 px apart, the current one black */
function GeneratorMenu({ current, height, onClose }: { current: string; /** The form's sheet's, which it lies over */ height: string; onClose: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onClose])
  const name = 'text-[24px] font-medium leading-6 tracking-[-0.01em] whitespace-nowrap'
  return (
    // A sheet of its own over the form's, as tall, as round and shadowed, 24 px in; the close icon where the
    // menu icon was, then the breadcrumbs, the generators 20 px apart under them (16 in Figma 5099:5825)
    <div role="dialog" aria-label="Конструкторы" style={{ height }} className="fixed inset-x-0 bottom-0 z-50 overflow-y-auto rounded-t-[24px] bg-white p-6 font-sans text-black shadow-[0_10px_30px_rgba(0,0,0,0.1)]">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <IconButton label="Закрыть" onClick={onClose} d="M4 3L8 7L12 3M4 13L8 9L12 13" />
          <PhoneCrumbs />
        </div>
        <nav aria-label="Конструкторы" className="flex flex-col items-start gap-5">
          {GENERATORS.map(g => g.path === current
            ? <span key={g.path} aria-current="page" className={name}>{g.title}</span>
            : <Link key={g.path} to={g.path} onClick={onClose} className={`${name} text-[#bfbfbf] outline-none active:text-[#808080]`}>{g.title}</Link>)}
        </nav>
      </div>
    </div>
  )
}

/** The breadcrumbs: Medium (Regular in Figma 5110:9105), on 16 px lines, 12 px after the icon (8 + 4: at 8 they stuck to it) */
function PhoneCrumbs() {
  return (
    <nav className="ml-1 flex min-w-0 flex-1 items-center gap-2 text-[14px] font-medium leading-4 [font-feature-settings:'case'_1]">
      <Link to="/" className={crumb}>Бренд UMO</Link>
      <span aria-hidden>·</span>
      <Link to="/#materials" className={crumb}>Носители</Link>
    </nav>
  )
}

/** A 16 px icon with a 2 px stroke as the form's own, on whole pixels (Figma's sheet has 1 px: 5110:9103, 5110:9091, 5103:6163), black or grey, a finger's 36 px round it */
function IconButton({ label, onClick, d, grey }: { label: string; onClick: () => void; d: string; grey?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={`relative flex size-4 shrink-0 cursor-pointer items-center justify-center outline-none after:absolute after:-inset-[10px] after:content-[''] ${grey ? 'text-[#808080]' : ''}`}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d={d} stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="bevel" /></svg>
    </button>
  )
}

/** Copies of the generators in the line: the middle one in view, a whole turn either side to scroll through */
const PHONE_TURNS = 3

/**
 * The generators' line, on every screen: scrolled natively, as a phone's tabs, by a finger, a trackpad or the wheel (the
 * ring turned by script ran on and came back round on its own, unlike anything else under a finger), and picked as a drum: the name the line comes to rest on,
 * 24 px from the edge where the ring had the current one, opens the instant the finger is off and the line is still; a
 * tap opens one too. It goes round as the ring did: the generators in their order three times over, the current one of
 * the middle copy at the edge, so there's a whole turn to scroll either way; every page puts its own there, so the line
 * looks the same after a pick, and a turn's worth of scrolling to the same name puts it back in the middle unseen.
 * 20 px apart (16 in Figma 5098:5496), the one nearest the edge black as it goes
 */
function GeneratorRing({ current }: { current: string }) {
  const navigate = useNavigate()
  const count = GENERATORS.length
  const middle = Math.floor(PHONE_TURNS / 2) * count + GENERATORS.findIndex(g => g.path === current)
  const nav = useRef<HTMLElement>(null)
  const [lit, setLit] = useState(current)
  const item = (i: number) => nav.current?.children[i] as HTMLElement | undefined
  // The current one of the middle copy at the edge, before the first paint and again once the font is in
  useLayoutEffect(() => {
    const home = () => { const n = nav.current, el = item(middle); if (n && el) n.scrollLeft = el.offsetLeft - 24 }
    home()
    document.fonts?.ready.then(home)
  }, [current]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const n = nav.current
    if (!n) return
    const nearest = () => {
      let best = middle
      let gap = Infinity
      for (let i = 0; i < count * PHONE_TURNS; i++) {
        const d = Math.abs(item(i)!.offsetLeft - n.scrollLeft - 24)
        if (d < gap) { gap = d; best = i }
      }
      return best
    }
    // The moment the line is still: `scrollend` where the browser has it, the instant the run and the snap are over;
    // elsewhere 150 ms with no scrolling (0 would open a name the line only passes by)
    const ends = 'onscrollend' in window
    let touching = false
    let timer = 0
    // Only a scroll someone made picks: the snap redoing itself as the panel resizes ended a scroll too, and opened the
    // next generator on its own
    let moved = false
    // The wheel scrolls the line across (a mouse has no other way to), and a pick waits until it's been still a moment,
    // as each notch of the wheel ends a scroll of its own
    let wheeled = 0
    const wheel = (e: WheelEvent) => {
      moved = true
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) { wheeled = performance.now(); return }
      e.preventDefault()
      wheeled = performance.now()
      n.scrollBy({ left: e.deltaY * (e.deltaMode === 1 ? 16 : 1), behavior: 'smooth' })
    }
    const pick = () => {
      if (touching || !moved) return
      const quiet = performance.now() - wheeled
      if (quiet < 300) { clearTimeout(timer); timer = window.setTimeout(pick, 300 - quiet); return }
      const i = nearest()
      const path = GENERATORS[i % count].path
      moved = false
      if (path !== current) navigate(path)
      // The same name a turn away: back to the middle copy, unseen
      else if (i !== middle) n.scrollLeft += item(middle)!.offsetLeft - item(i)!.offsetLeft
    }
    const settle = () => { clearTimeout(timer); if (!ends) timer = window.setTimeout(pick, 150) }
    // Keys move the focus along it, scrolling it too
    const key = () => { moved = true }
    // Resized, the current one back at the edge
    const observer = new ResizeObserver(() => { if (!moved) n.scrollLeft = item(middle)!.offsetLeft - 24 })
    observer.observe(n)
    const scroll = () => { setLit(GENERATORS[nearest() % count].path); settle() }
    const down = () => { touching = true; moved = true; clearTimeout(timer) }
    const up = () => { touching = false; settle() }
    if (ends) n.addEventListener('scrollend', pick)
    n.addEventListener('wheel', wheel, { passive: false })
    n.addEventListener('keydown', key)
    n.addEventListener('scroll', scroll, { passive: true })
    n.addEventListener('touchstart', down, { passive: true })
    n.addEventListener('touchend', up)
    n.addEventListener('touchcancel', up)
    return () => {
      clearTimeout(timer)
      n.removeEventListener('scrollend', pick)
      n.removeEventListener('wheel', wheel)
      n.removeEventListener('keydown', key)
      observer.disconnect()
      n.removeEventListener('scroll', scroll)
      n.removeEventListener('touchstart', down)
      n.removeEventListener('touchend', up)
      n.removeEventListener('touchcancel', up)
    }
  }, [current]) // eslint-disable-line react-hooks/exhaustive-deps
  const name = 'shrink-0 snap-start text-[24px] font-medium leading-6 tracking-[-0.01em] whitespace-nowrap'
  const tone = (path: string) => (path === lit ? 'text-black' : 'text-[#bfbfbf] hover:text-[#808080] active:text-[#808080]')
  return (
    <div className="relative -mx-6 my-1">
      {/* 8 px over and under for the descenders (р, у), which the scroller would clip */}
      <nav ref={nav} aria-label="Конструкторы" className="relative -my-2 flex snap-x snap-mandatory scroll-pl-6 gap-5 overflow-x-auto overscroll-x-contain py-2 pl-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {Array.from({ length: PHONE_TURNS * count }, (_, i) => {
          const g = GENERATORS[i % count]
          return i === middle
            ? <h1 key={i} className={`${name} ${tone(g.path)}`}>{g.title}</h1>
            : <Link key={i} to={g.path} draggable={false} aria-hidden={i < count || i >= 2 * count || undefined} tabIndex={i < count || i >= 2 * count ? -1 : undefined} className={`${name} ${tone(g.path)} outline-none`}>{g.title}</Link>
        })}
      </nav>
      {/* The shades over the edges, as the ring's (Figma 5062:671, 5061:539) */}
      <div aria-hidden className="pointer-events-none absolute -inset-y-2 left-0 w-6" style={{ background: 'linear-gradient(90deg, #ffffff80 25%, #fff0), linear-gradient(90deg, #fff 25%, #fff0)' }} />
      <div aria-hidden className="pointer-events-none absolute -inset-y-2 right-0 w-12" style={{ background: 'linear-gradient(90deg, #fff0, #ffffff80), linear-gradient(90deg, #fff0, #fff)' }} />
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
      className={`flex-1 min-w-0 flex items-center justify-center rounded-[8px] border px-3 py-[9px] in-[[data-sheet]]:py-[13px]! cursor-pointer outline-none
        focus-visible:ring-2 focus-visible:ring-black/30 disabled:cursor-not-allowed disabled:text-[#999]
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
    <div className="group/field flex flex-col gap-2">
      <p className={`text-[14px] leading-4 text-[#808080] whitespace-nowrap ${ALERT_LABEL}`}>{label}</p>
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
export function ComboField({ value, onChange, options, placeholder, label, invalid, singleLine, shownAs = t => t, truncate }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; label: string; invalid?: boolean; /** Enter doesn't break the line, pasted breaks become spaces */ singleLine?: boolean; /** How an option reads in the list, when it differs from the value it gives */ shownAs?: (t: string) => string; /** One line, cut off with an ellipsis, rather than growing: for a narrow field (the price tag's caption on phones) */ truncate?: boolean }) {
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
  // In the phone's sheet the list is a screen of its own, as a search: the field over it with «Готово», the list filling
  // the rest. It opens with no keyboard, the list in full view for a pick; a tap on its field brings the keyboard to type
  const inSheet = !!useContext(InSheet)
  const [screen, setScreen] = useState(false)
  const screenField = useRef<HTMLDivElement>(null)
  const openScreen = () => {
    (document.activeElement as HTMLElement | null)?.blur()
    setScreen(true)
  }
  const closeScreen = () => { setScreen(false); setAll(false) }
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
      {screen && createPortal(
        <div role="dialog" aria-label={label} className="fixed inset-0 z-50 flex flex-col bg-white font-sans text-black">
          <div ref={screenField} className="flex shrink-0 items-start gap-3 px-6 pt-4 pb-2">
            <TextArea
              value={value}
              placeholder={placeholder}
              aria-invalid={invalid || undefined}
              enterKeyHint="done"
              onChange={v => { onChange(singleLine || truncate ? v.replace(/\s*\n\s*/g, ' ') : v); setAll(false) }}
              onKeyDown={e => { if ((e.key === 'Enter' && singleLine) || e.key === 'Escape') { e.preventDefault(); closeScreen() } }}
              className="flex-1"
            />
            <button type="button" onClick={closeScreen} className="h-10 shrink-0 cursor-pointer text-[14px] leading-5 font-medium">Готово</button>
          </div>
          {/* Rows across the screen, as a native list, the picked one medium with a tick */}
          <div role="listbox" aria-label={label} className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 text-[14px] leading-5">
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
        document.body,
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
export const rowAction = 'flex shrink-0 cursor-pointer items-center gap-2 text-[14px] leading-4 text-[#808080] outline-none transition-colors hover:text-black focus-visible:ring-2 focus-visible:ring-black/30'

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
export const outlined = 'flex min-w-16 flex-1 items-center justify-center rounded-[8px] border border-black/10 px-3 py-[9px] in-[[data-sheet]]:py-[13px]! text-[14px] font-medium leading-5 text-black cursor-pointer outline-none hover:border-black/40 focus-visible:ring-2 focus-visible:ring-black/30 disabled:cursor-default disabled:text-[#999] disabled:hover:border-black/10'

/** A word the download bar's line says for a moment («В файле нет режимника») */
const flashes = new Set<(text: string) => void>()
/** Says something for two seconds over the download, where the line saying what's in the way stands */
export const flash = (text: string) => flashes.forEach(f => f(text))

/**
 * «Поделиться» (Figma 4939:3762): sends the page address — the settings are in it — so a set-up card or livery goes as a
 * link: on phones through the system's share sheet, elsewhere copied, the button itself saying «Ссылка с настройками
 * скопирована» for two seconds, where it was clicked (it was said by the line over it). Off while the result isn't ready (`incomplete`, as «Скачать»): a link is sent for what
 * it makes, not a draft. «Сбросить» stood beside it until resets moved onto the canvas, by what they reset
 */
/**
 * Sends the page address: on phones through the system's share sheet (the chat a link goes to in a tap or two,
 * «Скопировать» among them), elsewhere copied, `onCopied` saying so
 */
async function shareLink(onCopied: () => void) {
  const url = window.location.href
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ url })
      goal('copy_link', { page: location.pathname, shared: true })
    } catch { /* closed without sending */ }
    return
  }
  await navigator.clipboard.writeText(url)
  onCopied()
  goal('copy_link', { page: location.pathname })
}

export function LinkButtons({ incomplete }: { incomplete?: boolean }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])
  const share = () => { if (!copied) shareLink(() => setCopied(true)) }
  return (
    // White under it: on phones it stands over the canvas, and there its stroke is centred on its edge, half out, half
    // in (a trial): inside, the stroke left 38 px of white beside the solid 40 of the download, which read larger. Wide
    // screens keep the inside stroke
    <button type="button" onClick={share} title="Отправить ссылку на эти настройки" disabled={incomplete} aria-disabled={copied || undefined} className={`${outlined} w-full bg-white ${copied ? 'cursor-default hover:border-black/10! max-md:hover:shadow-[0_0_0_0.5px_rgba(0,0,0,0.1),inset_0_0_0_0.5px_rgba(0,0,0,0.1)]!' : ''} max-md:border-0 max-md:py-[10px] max-md:in-[[data-sheet]]:py-[14px]! max-md:shadow-[0_0_0_0.5px_rgba(0,0,0,0.1),inset_0_0_0_0.5px_rgba(0,0,0,0.1)] max-md:hover:shadow-[0_0_0_0.5px_rgba(0,0,0,0.4),inset_0_0_0_0.5px_rgba(0,0,0,0.4)] max-md:disabled:hover:shadow-[0_0_0_0.5px_rgba(0,0,0,0.1),inset_0_0_0_0.5px_rgba(0,0,0,0.1)]`}>
      {/* Regular, as a note rather than a button's name; while it shows the button is still, no hover or click, its text grey #808080, as quiet lines: the hover's edge is overridden, as
          pointer-events: none kept the browser's hover on until the pointer moved */}
      {copied ? <span className="font-normal text-[#808080]">Ссылка с настройками скопирована</span> : 'Поделиться'}
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
 * How many things are left to do before the download, after the note over it: «1/5», the one it names out of all the
 * empty and wrong fields left, over the whole list; none while it's the last
 */
export const stepsLeft = (n: number) => (n > 1 ? `1/${n}` : undefined)

/**
 * The download, at the foot of the sidebar (in the phone's sheet): one black button saying the next step while
 * something's in the way («Выбрать дилера 1/3», «Цена слишком низкая») and leading there, «Скачать PDF» once nothing
 * is. It was always «Скачать», greyed out, with a secondary button over it saying the step (and before that a black
 * line, under the button for a while)
 */
export function DownloadBar({ format, onClick, busy, disabled, note, count, onNote, links }: {
  format: 'PDF' | 'ZIP'
  onClick: () => void
  busy: boolean
  disabled?: boolean
  note?: string
  /** «1/5» after the note, grey: the one it names out of all that's left to do (`stepsLeft`) */
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
  // the way and how much is left («Выбрать дилера 1/3»), leading there (the phone's sheet opening first); else the
  // download, «Поделиться» with it. The bright button stays the next step, so it's pressed even unread, and the press
  // teaches what to do (on wide screens a secondary button saying the step stood over a greyed-out download)
  const foot = useContext(InFoot)
  const lead = disabled && !!note && !said
  const leads = lead && !!onNote
  const shareOn = !!links && !disabled && !said
  const main = (
    <button
      type="button"
      // The field focused in the tap itself: iOS raises the keyboard only for a focus within the gesture (it was 350 ms later,
      // after the sheet opened, and the field only lit up)
      onClick={leads ? () => { foot?.(); onNote!() } : onClick}
      disabled={busy || (disabled && !leads)}
      className={`flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-black px-3 py-[10px] in-[[data-sheet]]:py-[14px]! text-[14px] leading-5 outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2 hover:enabled:bg-[#333] disabled:cursor-default
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
  // Wide screens: 40 px off the form, sticking to the sidebar's foot; «Поделиться» over the download, as wide, so it
  // has room to say the link is copied
  return (
    <div className="sticky bottom-0 z-10 mt-8 flex flex-col gap-2 bg-white p-6 pt-0 tracking-normal">
      {shareOn && <div className="flex">{links}</div>}
      <div className="flex">{main}</div>
    </div>
  )
}
