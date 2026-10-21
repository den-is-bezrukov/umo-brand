import { useContext, useEffect, useRef, useState } from 'react'
import { ICON } from './icons'
import { goal, type Goal } from './metrika'
import { linkParams, saveAndOpenPdf } from './share'
import { templateTitle, itemName } from '@/data/generators'
import { ItemNumber } from '@/ui/staff'

// «Скачать шаблон»: every generator's editable template (the print file's pages, the text live in the brand font,
// `liveText.ts`), as a button under the canvas and as a link that never goes stale, `?t` (`?template`, the first one, still works), the blank one.

/** Saves a template under its name */
function save(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

/** Download, an arrow into a tray, the canvas icons' 1 px stroke */
const TemplateIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" {...ICON} aria-hidden><path d="M8 2.5V10M4.5 6.5L8 10L11.5 6.5M2.5 10.5V13.5H13.5V10.5" /></svg>
)

/**
 * «Скачать шаблон», an icon with its name as the tooltip, by the canvas's other icons: on the lists, in the column
 * after the item's own and before «Добавить» (`ItemFrame`'s `extra`); on the others in the caption under the picture,
 * before its reset (`CaptionReset`'s `extra`). Not a text button under the canvas: it gets clicked first, before the real download. `make`
 * gives what's on the page, placeholders where nothing is
 */
export function TemplateButton({ make, name, goalId, params, title: own }: { make: (() => Promise<Blob>) | undefined; name: string; goalId: Goal; params?: Record<string, string | number | boolean>; title?: string }) {
  const [busy, setBusy] = useState(false)
  // Named by the generator it's on, from its entry in `GENERATORS`
  // `title` where the file isn't a template (the livery's decals at their defaults)
  const title = own ?? templateTitle(location.pathname)
  // Screen readers' name with the item's number in a list's column («Скачать шаблон визитки 2», as `Action`)
  const n = useContext(ItemNumber)
  const said = n ? `Скачать шаблон ${itemName(location.pathname, n, true)}` : title
  const click = async (e: React.MouseEvent) => {
    // The template's, not the item's, which would select it
    e.stopPropagation()
    if (!make || busy) return
    setBusy(true)
    try {
      save(await make(), name)
      goal(goalId, params)
    } finally {
      setBusy(false)
    }
  }
  return (
    <button
      type="button"
      data-template
      title={title}
      aria-label={said}
      onClick={click}
      disabled={!make}
      className={`flex size-[30px] shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-caption hover:text-black disabled:cursor-default disabled:hover:text-caption ${busy ? 'animate-pulse' : ''}`}
    >
      <TemplateIcon />
    </button>
  )
}

/**
 * `t` in the link (<site>/<generator>?t; or `template`, which older links carry) saves the blank template to the downloads and opens it, no
 * editor, as the `pdf` links do: true while that's under way, the page rendering nothing. `make` is undefined until
 * the fonts are in
 */
export function useTemplateLink(make: (() => Promise<Blob>) | undefined, name: string, goalId: Goal): boolean {
  const [only, setOnly] = useState(() => linkParams().has('t') || linkParams().has('template'))
  const started = useRef(false)
  useEffect(() => {
    if (!only || !make || started.current) return
    started.current = true
    make()
      .then(blob => {
        saveAndOpenPdf(blob, name)
        goal(goalId, { via: 'link' })
      })
      .catch(() => setOnly(false))
  }, [make]) // eslint-disable-line react-hooks/exhaustive-deps
  return only
}
