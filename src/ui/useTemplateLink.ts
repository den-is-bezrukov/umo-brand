import { useEffect, useRef, useState } from 'react'
import { goal, type Goal } from './metrika'
import { linkParams, saveAndOpenPdf } from './share'

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
