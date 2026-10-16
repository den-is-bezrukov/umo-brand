import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** The ×'s hover, as the guide's links: #808080 at once, fading back */
const HOVER = 'transition-[color] duration-350 ease-[ease] hover:text-[#808080] hover:duration-0'

/**
 * The site's one dialog: the guide's «Редактор материалов» and the generators' «Помощь». Centred on the page over
 * black at 40%, 16 px off the screen's edges, white, 16 px round, 24 px in: the title in 16 px Medium and × on one row,
 * `head` under it (24 px apart), both standing still while the rest scrolls when it's taller than the screen. Esc, ×
 * or a click on the dark close it; the page under it doesn't scroll. Portalled, so a phone's sheet can't hold it
 */
export default function Dialog({ title, onClose, width = 360, head, children }: { title: string; onClose: () => void; width?: number; head?: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const overflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    ref.current?.focus()
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.documentElement.style.overflow = overflow }
  }, [onClose])
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal
        aria-labelledby={id}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: width }}
        className="flex max-h-full w-full flex-col gap-6 rounded-2xl bg-white pt-6 text-black outline-none"
      >
        <div className="flex shrink-0 flex-col gap-6 px-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id={id} className="text-[16px] font-medium leading-[1.25] tracking-[-0.01em]">{title}</h2>
            <button type="button" aria-label="Закрыть" onClick={onClose} className={`relative flex h-5 shrink-0 cursor-pointer items-center ${HOVER} after:absolute after:-inset-[10px] after:content-['']`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="square" /></svg>
            </button>
          </div>
          {head}
        </div>
        <div className="min-h-0 overflow-y-auto px-6 pb-6">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
