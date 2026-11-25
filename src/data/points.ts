import type { Point } from '@/brand'
import { POINTS } from '@brand/points'
import { WORDS } from '@brand/words'

// The brand's points of sale (its points; `@brand/points`), as the generators find and fill them in

export type { Point }

/**
 * Every point of sale, the brand's lists merged in order: a later one adds a point or, by the name of one already
 * there, what it's also called (`aka`), its phone, or what an earlier list has wrong
 */
export function mergePoints(lists: Partial<Point>[][]): Point[] {
  const all = new Map<string, Point>()
  for (const d of lists.flat()) {
    if (!d.name) continue
    const was = all.get(d.name)
    all.set(d.name, { name: d.name, city: d.city ?? was?.city ?? '', address: d.address ?? was?.address ?? '', hours: d.hours ?? was?.hours ?? '', phone: d.phone ?? was?.phone ?? '', aka: [...(was?.aka ?? []), ...(d.aka ?? [])] })
  }
  return [...all.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

export const ALL_POINTS = mergePoints(POINTS.lists)

/** The point's name in a link: the brand's word for it (`POINTS.param`), else `point` */
export const POINT_PARAM = POINTS.param ?? 'point'

/** The points' names as the brand writes them («<Бренд> Точка Город»), alphabetical: suggestions for the point fields */
export const POINT_NAMES = ALL_POINTS.map(d => d.name)

/** The same without the brand's name they all start with (`POINTS.prefix`: «Точка Город») */
const PREFIX = new RegExp(`^${POINTS.prefix}\\s+`)
export const withoutBrand = (name: string) => name.replace(PREFIX, '')

/** A point by its name, with the brand's name or without */
export const pointOf = (name: string) => ALL_POINTS.find(d => withoutBrand(d.name) === withoutBrand(name.trim()))

// Finding a point by what people write: «точка во владимире», «точка питер», «точка алтуфьево», «Point Центр»

/** What cities are also called */
const CITY_AKA: Record<string, string[]> = {
  'Санкт-Петербург': ['питер', 'спб', 'петербург'], 'Москва': ['мск'], 'Нижний Новгород': ['нн', 'нижний'],
  'Екатеринбург': ['екб'], 'Ростов-на-Дону': ['ростов'],
}
/** Words that don't tell points apart */
const STOP = new Set([...POINTS.words, WORDS.point.one.toLowerCase(), 'центр', 'г', 'город', 'в', 'во', 'на', 'из', 'и', 'у', 'ооо', 'ул', 'улица', 'пр', 'просп', 'проспект', 'д', 'дом', 'стр', 'корп', 'вл', 'й'])
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

/** Whether a written word is a point's word: its start (typed so far), the same stem in another case, or a typo */
function same(q: string, t: string) {
  if (q === t || (q.length > 1 && t.startsWith(q))) return true
  if (/\d/.test(q) || /\d/.test(t)) return false
  let p = 0
  while (p < q.length && q[p] === t[p]) p++
  return (p >= 4 && p >= Math.max(q.length, t.length) - 2) || (q.length >= 5 && t.length >= 5 && nearly(q, t))
}

/** A point's words: its name, city, what they're also called, and its address without the region */
const WORDS_OF = new Map(ALL_POINTS.map(d => [d, {
  name: words(withoutBrand(d.name)),
  all: words([withoutBrand(d.name), d.city, ...(CITY_AKA[d.city] ?? []), ...d.aka, d.address.replace(/[а-яё-]+\s+(область|обл\.?|край|район|муниципальный округ|городской округ|поселение)/gi, ' ')].join(' ')),
}]))

/**
 * The points a text may mean, best first: the one whose name it is, else those with every word written (a word no
 * point has, «вывеска», doesn't count), else those with the most. None when no word is any point's
 */
export function findPoints(text: string): Point[] {
  const typed = words(text)
  const exact = ALL_POINTS.filter(d => { const n = WORDS_OF.get(d)!.name; return n.length === typed.length && n.every((w, i) => w === typed[i]) })
  if (exact.length) return exact
  const known = typed.filter(q => ALL_POINTS.some(d => WORDS_OF.get(d)!.all.some(t => same(q, t))))
  if (!known.length) return []
  const scored = ALL_POINTS.map(d => {
    const { all } = WORDS_OF.get(d)!
    return { d, hits: known.filter(q => all.some(t => same(q, t))).length }
  })
  const best = Math.max(...scored.map(s => s.hits))
  return scored.filter(s => s.hits === best).map(s => s.d)
}

/** Whether every word written is some point's: else a word was dropped, and a single point found may not be the one meant («Рольф Сити») */
export const knowsEveryWord = (text: string) => words(text).every(q => ALL_POINTS.some(d => WORDS_OF.get(d)!.all.some(t => same(q, t))))

/** Point names (from `options`, with the brand's name or without) a point field shows for what's typed, as `findPoints` finds them */
export const pointFilter = (typed: string, options: string[]) => {
  const found = new Set(findPoints(typed).map(d => withoutBrand(d.name)))
  return options.filter(o => found.has(withoutBrand(o)))
}

/** A point's phone, as written (the fields put it through their mask) */
export const phoneOf = (name: string) => pointOf(name)?.phone || undefined
