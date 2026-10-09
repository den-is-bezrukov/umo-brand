// A person's name and surname hold letters only: a digit or a sign is a slip, most often a table pasted askew (a row
// number, a staff number, the phone column), so it's an error the person sees rather than something taken out quietly.

/** Letters, spaces, hyphens and dashes, apostrophes (Д'Артаньян) and dots (initials) */
const NAME_CHAR = /[\p{L}\p{M}\s\-‐‑–—'’ʼ.]/u

/** What's wrong with a name or surname as typed, said after its label («Имя: цифры»); null if nothing */
export function nameFault(t: string): string | null {
  if (/\d/.test(t)) return 'цифры'
  const odd = [...new Set([...t].filter(c => !NAME_CHAR.test(c)))]
  return odd.length ? `лишние знаки ${odd.map(c => `«${c}»`).join(', ')}` : null
}
