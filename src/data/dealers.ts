import site from './dealers.json'
import own from './dealers-own.json'

/** A dealer as the generators know it: umo.auto's data, and the hand-kept names it's also called by (`aka`) */
export interface Dealer { name: string; city: string; address: string; hours: string; aka: string[] }

/**
 * Every dealer: umo.auto's (dealers.json, parsed by scripts/fetch-dealers.mjs) and the hand-kept ones (dealers-own.json):
 * a dealer signed but not on umo.auto yet, with its city and address, or, by the name of one already there, only the
 * names it's also called by («Мажор» for Major), or anything umo.auto has wrong
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
