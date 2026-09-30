import { useEffect, type RefObject } from 'react'
import Typograf from 'typograf'

// Keeps prepositions, conjunctions and other short words from dangling at line ends. The layout is fluid,
// so non-breaking spaces can't be placed by hand for one width — instead every text node under the root
// is run through Typograf's non-breaking-space rules after React renders it.

const NBSP = ' '

// Gaps in Typograf's rules for this guide's copy.
Typograf.addRule({ name: 'common/nbsp/umoModel', handler: text => text.replace(/\bUMO (\d)\b/g, `UMO${NBSP}$1`) })
Typograf.addRule({
  name: 'common/nbsp/umoUnits',
  handler: text => text.replace(/(\d) (мм|см|px|pt|rem|млн|млрд|тыс)(?=[\s.,;:!?)»]|$)/g, `$1${NBSP}$2`),
})
Typograf.addRule({ name: 'ru/nbsp/umoRuble', handler: text => text.replace(/ ₽/g, `${NBSP}₽`) })

// Only spacing rules: the copy already has proper quotes, dashes and ellipses, and a per-node pass
// can't pair quotes reliably anyway.
const typograf = new Typograf({
  locale: ['ru', 'en-US'],
  disableRule: '*',
  enableRule: ['common/nbsp/*', 'ru/nbsp/*', 'ru/dash/main'],
})
typograf.disableRule(['common/nbsp/replaceNbsp', 'common/nbsp/nowrap'])

function fix(node: Text) {
  const text = node.nodeValue
  if (!text || !text.includes(' ')) return
  const result = typograf.execute(text)
  // Only write when something changed, so the observer below doesn't loop on its own edits.
  if (result !== text) node.nodeValue = result
}

function fixTree(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) return fix(root as Text)
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) fix(node as Text)
}

/** Applies the typograph to everything rendered under `ref`, including text React adds or changes later. */
export function useTypograf(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current
    if (!root) return
    fixTree(root)
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        if (m.type === 'characterData') fix(m.target as Text)
        else m.addedNodes.forEach(fixTree)
      }
    })
    observer.observe(root, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [ref])
}
