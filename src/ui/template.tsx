import { useEffect, useRef, useState } from 'react'
import { outlined } from './form'
import { goal, type Goal } from './metrika'
import { linkParams, saveAndOpenPdf } from './share'

// «Скачать шаблон»: every generator's editable template (the print file's pages, the text live in CoFo Sans,
// `liveText.ts`), as a button under the canvas and as a link that never goes stale, `?template`, the blank one.

/** Saves a template under its name */
function save(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

/**
 * «Скачать шаблон», a secondary button as wide as its text: under the canvas, before «Добавить» on the lists (the pair
 * centred, 8 px apart), alone and centred on the others. `make` gives what's on the page, placeholders where nothing is
 */
export function TemplateButton({ make, name, goalId, params }: { make: (() => Promise<Blob>) | undefined; name: string; goalId: Goal; params?: Record<string, string | number | boolean> }) {
  const [busy, setBusy] = useState(false)
  const click = async () => {
    if (!make) return
    setBusy(true)
    try {
      save(await make(), name)
      goal(goalId, params)
    } finally {
      setBusy(false)
    }
  }
  return (
    <button type="button" data-template onClick={click} disabled={!make || busy} className={`${outlined} flex-none`}>
      {busy ? 'Собираем…' : 'Скачать шаблон'}
    </button>
  )
}

/**
 * `template` in the link (umo.autos/<generator>?template) saves the blank template to the downloads and opens it, no
 * editor, as the `pdf` links do: true while that's under way, the page rendering nothing. `make` is undefined until
 * the fonts are in
 */
export function useTemplateLink(make: (() => Promise<Blob>) | undefined, name: string, goalId: Goal): boolean {
  const [only, setOnly] = useState(() => linkParams().has('template'))
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
