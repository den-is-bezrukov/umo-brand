/** The generators' shortcuts: ⌘ on a Mac, Ctrl elsewhere, said in the buttons' tooltips only */
const MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** «⌘» or «Ctrl+», before the key in a tooltip */
export const MOD = MAC ? '⌘' : 'Ctrl+'

/** ⌘ or Ctrl held, with no Alt; the key is matched by its place (`e.code`), so it works in the Russian layout too */
export const withMod = (e: KeyboardEvent, code: string) => (MAC ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey) && !e.altKey && e.code === code
