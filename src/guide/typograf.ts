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
// A sentence's first word doesn't hang at the end of a line after the previous sentence («…Яндекса. Запас /
// хода…»): it's tied to the word after it.
Typograf.addRule({
  name: 'common/nbsp/umoSentenceStart',
  handler: text => text.replace(/([.!?…]) (\p{Lu}[\p{L}\d-]*) /gu, `$1 $2${NBSP}`),
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
// Words of up to 3 letters (в, на, для, все…) never end a line: they're tied to the word after them.
typograf.setSetting('common/nbsp/afterShortWord', 'lengthShortWord', 3)

const INLINE = new Set(['A', 'SPAN', 'STRONG', 'EM', 'B', 'I', 'SMALL', 'ABBR', 'CODE', 'SUP', 'SUB'])

/** Whether no text follows `node` up to the end of its block or a line break — the node holds the last line. */
function endsLine(node: Node) {
  for (let n: Node = node; ; n = n.parentNode!) {
    for (let s = n.nextSibling; s; s = s.nextSibling) {
      if (s.nodeName === 'BR') return true
      if (s.textContent?.trim()) return false
    }
    if (!n.parentNode || !INLINE.has(n.parentNode.nodeName)) return true
  }
}

function fix(node: Text) {
  const text = node.nodeValue
  if (!text || !text.includes(' ')) return
  let result = typograf.execute(text)
  // Typograf sees one text node at a time, so it can't tell where a paragraph ends: the last word is tied to the
  // one before it here, so a line never holds a single word alone.
  if (endsLine(node)) result = result.replace(/ (\S+\s*)$/, `${NBSP}$1`)
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
