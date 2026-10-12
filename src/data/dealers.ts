import site from './dealers.json'
import own from './dealers-own.json'

/** A dealer as the generators know it: umo.auto's data, and the hand-kept names it's also called by (`aka`) */
export interface Dealer { name: string; city: string; address: string; hours: string; aka: string[] }

/**
 * Every dealer: umo.auto's (dealers.json, parsed by scripts/fetch-dealers.mjs) and the hand-kept ones (dealers-own.json):
 * a dealer signed but not on umo.auto yet, with its city and address, or, by the name of one already there, only the
 * names it's also called by («Мажор» for Major), or anything umo.auto has wrong. Also made into umo.autos/dealers.txt
 */
export function mergeDealers(fromSite: Partial<Dealer>[], fromHand: Partial<Dealer>[]): Dealer[] {
  const all = new Map<string, Dealer>()
  for (const d of [...fromSite, ...fromHand]) {
    if (!d.name) continue
    const was = all.get(d.name)
    all.set(d.name, { name: d.name, city: d.city ?? was?.city ?? '', address: d.address ?? was?.address ?? '', hours: d.hours ?? was?.hours ?? '', aka: [...(was?.aka ?? []), ...(d.aka ?? [])] })
  }
  return [...all.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

export const DEALERS = mergeDealers(site, own)

/** Dealers' marketing names («UMO АГАТ Владимир»), alphabetical: suggestions for the dealer fields */
export const DEALER_NAMES = DEALERS.map(d => d.name)

/** The same without the «UMO » they all start with («АГАТ Владимир») */
export const withoutUmo = (name: string) => name.replace(/^UMO\s+/, '')

/** A dealer by its name, with «UMO» or without */
export const dealerOf = (name: string) => DEALERS.find(d => withoutUmo(d.name) === withoutUmo(name.trim()))

// Finding a dealer by what people write: «агат во владимире», «мажор питер», «автодом алтуфьево», «Major Олимп»

/** What cities are also called */
const CITY_AKA: Record<string, string[]> = {
  'Санкт-Петербург': ['питер', 'спб', 'петербург'], 'Москва': ['мск'], 'Нижний Новгород': ['нн', 'нижний'],
  'Екатеринбург': ['екб'], 'Ростов-на-Дону': ['ростов'],
}
/** Words that don't tell dealers apart */
const STOP = new Set(['umo', 'умо', 'юмо', 'салон', 'автосалон', 'дилер', 'дилерский', 'дилерство', 'центр', 'дц', 'г', 'город', 'в', 'во', 'на', 'из', 'и', 'у', 'ооо', 'ул', 'улица', 'пр', 'просп', 'проспект', 'д', 'дом', 'стр', 'корп', 'вл', 'й'])
const LATIN: [RegExp, string][] = [
  [/sh/g, 'ш'], [/ch/g, 'ч'], [/zh/g, 'ж'], [/kh/g, 'х'], [/ts/g, 'ц'], [/ya/g, 'я'], [/yu/g, 'ю'],
  ...'а б к д е ф г х и й к л м н о п к р с т у в в кс ы з'.split(' ').map((ru, i): [RegExp, string] => [new RegExp('abcdefghijklmnopqrstuvwxyz'[i], 'g'), ru]),
]
const latinToRu = (t: string) => LATIN.reduce((s, [re, ru]) => s.replace(re, ru), t)

/** A text's words, lower case, ё as е, latin also as Russian letters («major» → «майор») */
function words(text: string): string[] {
  const out: string[] = []
  for (const w of text.toLowerCase().replace(/ё/g, 'е').split(/[^a-zа-я0-9]+/)) {
    if (!w || STOP.has(w)) continue
    out.push(w)
    if (/[a-z]/.test(w)) out.push(latinToRu(w))
  }
  return out
}

/** One edit apart (a letter missed, added or wrong), for typos in longer words */
function nearly(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  while (i < a.length && a[i] === b[i]) i++
  return a.slice(i + 1) === b.slice(i + 1) || a.slice(i) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i)
}

/** Whether a written word is a dealer's word: its start (typed so far), the same stem in another case, or a typo */
function same(q: string, t: string) {
  if (q === t || (q.length > 1 && t.startsWith(q))) return true
  if (/\d/.test(q) || /\d/.test(t)) return false
  let p = 0
  while (p < q.length && q[p] === t[p]) p++
  return (p >= 4 && p >= Math.max(q.length, t.length) - 2) || (q.length >= 5 && t.length >= 5 && nearly(q, t))
}

/** A dealer's words: its name, city, what they're also called, and its address without the region */
const WORDS = new Map(DEALERS.map(d => [d, {
  name: words(withoutUmo(d.name)),
  all: words([withoutUmo(d.name), d.city, ...(CITY_AKA[d.city] ?? []), ...d.aka, d.address.replace(/[а-яё-]+\s+(область|обл\.?|край|район|муниципальный округ|городской округ|поселение)/gi, ' ')].join(' ')),
}]))

/**
 * The dealers a text may mean, best first: the one whose name it is, else those with every word written (a word no
 * dealer has, «салон», doesn't count), else those with the most. None when no word is any dealer's
 */
export function findDealers(text: string): Dealer[] {
  const typed = words(text)
  const exact = DEALERS.filter(d => { const n = WORDS.get(d)!.name; return n.length === typed.length && n.every((w, i) => w === typed[i]) })
  if (exact.length) return exact
  const known = typed.filter(q => DEALERS.some(d => WORDS.get(d)!.all.some(t => same(q, t))))
  if (!known.length) return []
  const scored = DEALERS.map(d => {
    const { all } = WORDS.get(d)!
    return { d, hits: known.filter(q => all.some(t => same(q, t))).length }
  })
  const best = Math.max(...scored.map(s => s.hits))
  return scored.filter(s => s.hits === best).map(s => s.d)
}

/** Whether every word written is some dealer's: else a word was dropped, and a single dealer found may not be the one meant («Рольф Сити») */
export const knowsEveryWord = (text: string) => words(text).every(q => DEALERS.some(d => WORDS.get(d)!.all.some(t => same(q, t))))

/** Dealer names (from `options`, with «UMO» or without) a dealer field shows for what's typed, as `findDealers` finds them */
export const dealerFilter = (typed: string, options: string[]) => {
  const found = new Set(findDealers(typed).map(d => withoutUmo(d.name)))
  return options.filter(o => found.has(withoutUmo(o)))
}
