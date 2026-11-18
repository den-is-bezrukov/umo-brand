// Shared form values and helpers; kept outside the React refresh boundary.
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

export const ALERT_LABEL = 'group-has-[[aria-invalid=true]]/field:text-error'

export const rowAction = 'flex shrink-0 cursor-pointer items-center gap-2 text-[14px] leading-4 text-caption transition-colors hover:text-ink'

// Edged at 10%, at 40% on hover
export const outlined = 'flex min-w-16 flex-1 items-center justify-center rounded-control border border-ink/10 px-3 py-[9px] in-[[data-sheet]]:py-[13px]! text-[14px] font-medium leading-5 text-ink cursor-pointer hover:border-ink/40 disabled:cursor-default disabled:text-hint disabled:hover:border-ink/10'

/** A word the download bar's line says for a moment («В файле нет режимника») */
export const flashes = new Set<(text: string) => void>()
/** Says something for two seconds over the download, where the line saying what's in the way stands */
export const flash = (text: string) => flashes.forEach(f => f(text))

/** Whether the browser sends files through the share sheet (phones, Safari, Chrome; not Firefox) */
export const canShareFiles = (() => {
  try { return !!navigator.canShare?.({ files: [new File([''], 'x.pdf', { type: 'application/pdf' })] }) } catch { return false }
})()

/**
 * The empty fields said in the download button, in the form's order, as what to do there, in the infinitive, a
 * button's verb («Выбрать точку», «Указать цену»), going on as they're filled in. A wholly empty form says its first
 * field too: it's the first step (not «Не хватает данных»)
 */
export const unfilled = (said: string[]) => said[0]

/**
 * Which item the note over the download is about, after it: «3/8», its number (as beside it in the list) of all; none
 * for one item or a note about what they share (the point). Not «1/5», the first of all the empty and wrong fields
 * left, which never moves on and reads as a stuck progress
 */
export const itemOf = (index: number, total: number) => (total > 1 && index >= 0 ? `${index + 1}/${total}` : undefined)

