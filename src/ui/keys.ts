/** The generators' shortcuts: ⌘ on a Mac, Ctrl elsewhere, said in the buttons' tooltips only */
const MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** «⌘» or «Ctrl+», before the key in a tooltip */
export const MOD = MAC ? '⌘' : 'Ctrl+'

/** ⌘ or Ctrl held, with no Alt; the key is matched by its place (`e.code`), so it works in the Russian layout too */
export const withMod = (e: KeyboardEvent, code: string) => (MAC ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey) && !e.altKey && e.code === code

/** The Russian letter on each key of the Latin layout (ЙЦУКЕН over QWERTY), and back */
const EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`"
const RU = 'йцукенгшщзхъфывапролджэячсмитьбюё'

/**
 * A text typed in the other layout, key for key: «fufn» → «агат», «гьщ» → «umo». The suggestions read it too, so a
 * dealer or a position is found with the layout left wrong; what's typed stays as it is until a suggestion is picked
 */
export const otherLayout = (text: string) =>
  [...text].map(c => { const i = EN.indexOf(c); if (i >= 0) return RU[i]; const j = RU.indexOf(c); return j >= 0 ? EN[j] : c }).join('')
