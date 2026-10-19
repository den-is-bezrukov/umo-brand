import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CrossIcon } from './icons'

/** The ×'s hover, as the guide's links: #808080 at once, fading back */
const HOVER = 'transition-[color] duration-350 ease-[ease] hover:text-[#808080] hover:duration-0'

/**
 * The site's one dialog: the guide's «Редактор материалов» and the generators' «Инструкция». Over black at 40%, centred
 * across and down, at least 64 px off the screen's edges (16 on phones), white, 16 px round, 24 px in: the title in
 * 16 px Medium and × (the generators' `CrossIcon` at 2 px) on one row, `head` under it (24 px apart). It grows with what's in it, no scroll inside: taller
 * than the screen, it stands 64 px from the top and the dark scrolls with it, the page under it staying still. Esc, × or a click on the dark close it.
 * Portalled, so a phone's sheet can't hold it
 */
export default function Dialog({ title, onClose, width = 360, head, children }: { title: ReactNode; onClose: () => void; width?: number; head?: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const overflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    ref.current?.focus({ preventScroll: true })
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.documentElement.style.overflow = overflow }
  }, [onClose])
  return createPortal(
    <div data-dim className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/40 p-4 font-sans md:p-16" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal
        aria-labelledby={id}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: width }}
        className="my-auto flex w-full flex-col gap-6 rounded-2xl bg-white p-6 text-black outline-none"
      >
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id={id} className="text-[16px] font-medium leading-[1.25] tracking-[-0.01em]">{title}</h2>
            <button type="button" aria-label="Закрыть" onClick={onClose} className={`relative flex h-5 shrink-0 cursor-pointer items-center ${HOVER} after:absolute after:-inset-[10px] after:content-['']`}>
              <CrossIcon weight={2} />
            </button>
          </div>
          {head}
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
