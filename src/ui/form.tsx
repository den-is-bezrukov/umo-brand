import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

// Sidebar controls shared by the generators (price card, dealer livery, plate frame, name tag). Light UI per the Figma layout
// (UMO | Evrone, nodes 4844:6865 and 4900:4588), matching the brand guide.

/** The tick of checkboxes and of a good link (Figma 4900:4657): a 2 px stroke with square ends */
function Tick({ color = 'black' }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M11.5 4L5.5 10L2.5 7" stroke={color} strokeWidth="2" strokeLinecap="square" />
    </svg>
  )
}

/** In alphabetical order, as the switcher lists them */
const GENERATORS = [
  { path: '/name-tag', title: 'Бейдж' },
  { path: '/livery', title: 'Ливрея' },
  { path: '/price-card', title: 'Прайс-карта' },
  { path: '/plate-frame', title: 'Рамка номера' },
]

/**
 * The top of a generator's sidebar (Figma 4900:4589): breadcrumbs back to the guide and to its Носители chapter, and
 * the title, whose chevron opens the browser's own picker to switch to the other generator — a native select laid
 * transparent over the title.
 */
export function GeneratorHeader({ current }: { current: '/price-card' | '/livery' | '/plate-frame' | '/name-tag' }) {
  const navigate = useNavigate()
  const crumb = 'underline decoration-transparent decoration-[2.5%] underline-offset-[25%] [text-decoration-skip-ink:none] transition-[text-decoration-color] duration-250 hover:decoration-black/40 hover:duration-0'
  return (
    <div className="flex flex-col gap-4">
      <nav className="flex items-center gap-2 text-[14px] font-medium leading-5 tracking-normal [font-feature-settings:'case'_1]">
        <Link to="/" className={crumb}>Бренд UMO</Link>
        <span aria-hidden>·</span>
        <Link to="/#materials" className={crumb}>Носители</Link>
      </nav>
      <div className="relative flex items-center gap-1 self-start">
        <h1 className="text-[24px] font-medium leading-none">{GENERATORS.find(g => g.path === current)!.title}</h1>
        <svg width="24" height="24" viewBox="-4 -4 24 24" fill="none" aria-hidden className="relative top-px -ml-px">
          <path d="M4 6L8 10L12 6" stroke="black" strokeWidth="2" strokeLinecap="square" />
        </svg>
        <select
          value={current}
          onChange={e => navigate(e.target.value)}
          aria-label="Конструктор"
          className="absolute inset-0 cursor-pointer appearance-none opacity-0 outline-none"
        >
          {GENERATORS.map(g => <option key={g.path} value={g.path}>{g.title}</option>)}
        </select>
      </div>
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
      className={`flex-1 min-w-0 flex items-center justify-center rounded-[4px] border px-3 py-[9px] cursor-pointer outline-none
        focus-visible:ring-2 focus-visible:ring-black/30 disabled:cursor-not-allowed disabled:opacity-40
        ${active ? 'border-black' : 'border-transparent hover:enabled:border-black/20'}`}
    >
      <span className="font-medium text-[14px] leading-5 text-black whitespace-nowrap">{children}</span>
    </button>
  )
}

// Spacing per Figma (UMO | Evrone, node 4900:4595): 8 px from a label to its control, 16 px between groups — the gap
// of the column the groups sit in.

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[14px] leading-5 text-[#999] whitespace-nowrap">{label}</p>
      {children}
    </div>
  )
}

export function Segments({ children }: { children: React.ReactNode }) {
  return <div className="flex rounded-[4px] bg-[#f5f5f5]">{children}</div>
}

export function TextInput({ value, onChange, onBlur, placeholder, invalid, numeric, list, className = '' }: { value: string; onChange: (v: string) => void; onBlur?: () => void; placeholder?: string; invalid?: boolean; numeric?: boolean; list?: string; className?: string }) {
  return (
    <input
      value={value}
      list={list}
      onChange={e => onChange(e.target.value)}
      onBlur={() => onBlur?.()}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      inputMode={numeric ? 'numeric' : undefined}
      pattern={numeric ? '[0-9 ]*' : undefined}
      className={`h-10 w-full min-w-0 rounded-[4px] bg-[#f5f5f5] px-3 text-[14px] leading-5 text-black outline-none placeholder:text-[#999]
        ${invalid ? 'ring-1 ring-inset ring-[#e30]' : 'focus:ring-1 focus:ring-inset focus:ring-black'} ${className}`}
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

const areaClass = 'block min-h-10 w-full min-w-0 resize-none overflow-hidden rounded-[4px] bg-[#f5f5f5] py-[10px] px-3 text-[14px] leading-5 text-black outline-none placeholder:text-[#999]'

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
      className={`${areaClass} ${invalid ? 'ring-1 ring-inset ring-[#e30]' : 'focus:ring-1 focus:ring-inset focus:ring-black'} ${className}`}
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
export function ComboField({ value, onChange, options, placeholder, label, invalid }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; label: string; invalid?: boolean }) {
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
    } else if (e.key === 'Escape' && open) {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div ref={box} className="relative" style={{ anchorName: anchor } as React.CSSProperties}>
      <TextArea
        value={value}
        onChange={v => { onChange(v); setAll(false); setOpen(true) }}
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
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M4 6L8 10L12 6" stroke="black" strokeWidth="1.5" />
        </svg>
      </button>
      <div
        ref={list}
        id={id}
        popover="manual"
        role="listbox"
        aria-label={label}
        onMouseDown={e => e.preventDefault()}
        className="max-h-[288px] overflow-y-auto rounded-[4px] border border-black/10 bg-white p-1 text-[14px] leading-5 text-black shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
        // The popover's own styles centre it on the screen (inset 0, margin auto): undone here, then put under the field
        style={{
          position: 'fixed',
          inset: 'auto',
          margin: 0,
          ...(ANCHOR ? { positionAnchor: anchor, top: 'calc(anchor(bottom) + 4px)', left: 'anchor(left)', width: 'anchor-size(width)' } : {}),
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
            className={`cursor-pointer rounded-[2px] px-2 py-1.5 ${i === active ? 'bg-[#f5f5f5]' : ''} ${t === hit ? 'font-medium' : ''}`}
          >
            {t.replace('\n', ' ')}
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
        className={`${areaClass} break-all pr-9 ${error ? 'ring-1 ring-inset ring-[#e30]' : 'focus:ring-1 focus:ring-inset focus:ring-black'}`}
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
export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[14px] leading-5 text-black">
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
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Checkbox checked={on} onChange={onChange}>{label}</Checkbox>
        {on && extra}
      </div>
      {on && children}
    </div>
  )
}

/**
 * Text size as one word at the end of a field's label row (Figma: UMO | Evrone, node 4900:4662): «Увеличить» while the
 * text is small, «Уменьшить» once it's large; a press switches. Shown only where the larger size is available.
 */
export function SizeSwitch({ large, onChange }: { large: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!large)}
      aria-pressed={large}
      aria-label="Крупный текст"
      className="shrink-0 cursor-pointer text-[14px] font-medium leading-5 text-black outline-none transition-colors hover:text-black/50 focus-visible:ring-2 focus-visible:ring-black/30"
    >
      {large ? 'Уменьшить' : 'Увеличить'}
    </button>
  )
}

export const outlined = 'flex min-w-16 flex-1 items-center justify-center rounded-[4px] border border-black/10 p-3 text-[14px] font-medium leading-[1.13] tracking-[-0.01em] text-black cursor-pointer outline-none hover:border-black/30 focus-visible:ring-2 focus-visible:ring-black/30'

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
        onClick={() => navigator.clipboard.writeText(window.location.href).then(() => setCopied(true))}
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
      className="flex w-full min-w-16 items-center justify-center gap-2 rounded-[4px] bg-black p-3 text-[14px] font-medium leading-[1.13] tracking-[-0.01em] text-white cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-[#333]"
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
