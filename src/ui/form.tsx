import { useLayoutEffect, useRef, useState } from 'react'
import svgPaths from '@/icons/ui'

// Sidebar controls shared by the generators (price card, dealer livery). Light UI per the Figma layout
// (UMO | Evrone, node 4844:6864), matching the brand guide.

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

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <p className="py-2 text-[14px] leading-5 text-[#999] whitespace-nowrap">{label}</p>
      {children}
    </div>
  )
}

export function Segments({ children }: { children: React.ReactNode }) {
  return <div className="flex rounded-[4px] bg-[#f5f5f5]">{children}</div>
}

export function TextInput({ value, onChange, onBlur, placeholder, invalid, numeric, className = '' }: { value: string; onChange: (v: string) => void; onBlur?: () => void; placeholder?: string; invalid?: boolean; numeric?: boolean; className?: string }) {
  return (
    <input
      value={value}
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
export function TextArea({ value, onChange, placeholder, invalid }: { value: string; onChange: (v: string) => void; placeholder?: string; invalid?: boolean }) {
  const ref = useAutoHeight(value)
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      className={`${areaClass} ${invalid ? 'ring-1 ring-inset ring-[#e30]' : 'focus:ring-1 focus:ring-inset focus:ring-black'}`}
    />
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
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-label="Ссылка в порядке">
            <path d={svgPaths.p3de7e600} stroke="#00C950" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.45833" />
          </svg>
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

export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-2 text-[14px] leading-5">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="size-4 accent-black" />
      {children}
    </label>
  )
}

export function DownloadButton({ onClick, busy, disabled, children }: { onClick: () => void; busy: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className="flex w-full items-center justify-center gap-2 rounded-[4px] bg-black p-3 text-[16px] font-medium leading-none tracking-[-0.01em] text-white cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-[#333]"
    >
      {busy && (
        <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" aria-hidden>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      )}
      {busy ? 'Генерация…' : children}
    </button>
  )
}
