/**
 * Obscene words, so a generator never sets one on an official UMO layout («Центр UMO | <мат>» on umo.autos).
 * Only the obscene vocabulary (мат) and a few English words of the kind; jokes and rude-but-printable words pass.
 * Text is checked word by word after normalising disguises: case, ё, Latin and digit look-alikes, letters spaced
 * or dotted apart («х у й», «х.у.й»), a star in place of a letter («х*й»). Roots that occur inside ordinary words
 * (еб in хлеб and небо, бля in рубля, манда in команда) are anchored to the start of the word or to a prefix.
 */

const CYRILLIC: Record<string, string> = {
  a: 'а', b: 'в', c: 'с', e: 'е', h: 'н', k: 'к', m: 'м', o: 'о', p: 'р', t: 'т', x: 'х', y: 'у',
  '0': 'о', '1': 'и', '3': 'з', '4': 'ч', '6': 'б', '@': 'а', 'ё': 'е',
}
const LATIN: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '@': 'a', $: 's' }

// A star stands for any hidden letter, so it's allowed wherever a vowel is
const RUSSIAN = [
  /(?<!стра)х[у*]+[йеияю*]/, // хуй, хуёвый, нахуя, охуеть; not страхуй
  /п[ие*]зд/, // пизда, распиздяй
  /^(?:за|вы|до|на|по|про|пере|при|у|недо|долбо|мозго|(?:с|в|под|раз|из|от|об)[ъь]|под|раз|из|от)?[е*]б(?:[аеиоуыюлнтчкшь*]|$)/, // ебать, заебал, выеб, съебаться; not хлеб, небо, себе
  /бл[я*]д/, // блядь
  /^бл[я*]+(?:т|$)/, // бля, блять; not рубля, гребля
  /^муд[аоие*]/, // мудак, мудило; not мудрый, Амударья
  /п[и*]д[оа*]р/, // пидор, пидарас
  /п[ие]д[еоа]раст/, // педераст
  /залуп/,
  /^манд(?:а|ы|е|у|ой|ец|ятина|авош\S*)?$/, // манда, мандавошка; not мандарин, команда, мандат
  /^г[ао]нд[оа]н/, // гондон; not гондола
  /^шлюх/,
  /^сук[аиуео]?$/, /^суч(?:ар|к|ь)/,
]
const ENGLISH = [/f[u*]+c?k/, /^c[u*]nts?$/, /^sh[i*]t(?!ake)/, /b[i*]tch/, /assh[o*]le/, /^wh[o*]res?$/, /^f[a*]gg?[o*]?t?s?$/, /n[i*]gg[ae]r/, /^d[i*]ckhead/]

/** The word-like pieces of a text: each chunk with its punctuation dropped and split at it, and runs of single letters joined */
function words(text: string): string[] {
  const out: string[] = []
  let run = ''
  const flush = () => { if (run.length > 1) out.push(run); run = '' }
  for (const chunk of text.split(/\s+/)) {
    const joined = chunk.replace(/[^\p{L}*]/gu, '')
    if (joined) out.push(joined)
    for (const part of chunk.split(/[^\p{L}*]+/u)) {
      if (!part) continue
      if (part.length === 1) { run += part; continue }
      flush()
      out.push(part)
    }
  }
  flush()
  return out
}

const normalise = (text: string, map: Record<string, string>) => [...text.toLowerCase()].map(c => map[c] ?? c).join('')

export function hasProfanity(text: string): boolean {
  return words(normalise(text, CYRILLIC)).some(w => RUSSIAN.some(r => r.test(w)))
    || words(normalise(text, LATIN)).some(w => ENGLISH.some(r => r.test(w)))
}

export const PROFANITY = 'Недопустимое слово'
