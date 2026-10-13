import dealers from './dealers.json'
import { withoutUmo } from './dealers'

// The hours sign's texts: the line under the hours, and what umo.auto says of a dealer

/** The line under the hours: the default, as the source has it, then the other suggestions */
export const DEFAULT_HOURS_LINE = 'Работаем без выходных'
export const HOURS_LINES = [DEFAULT_HOURS_LINE, 'Ежедневно', 'Без выходных и перерывов']

const dealerOf = (name: string) => dealers.find(d => withoutUmo(d.name) === withoutUmo(name.trim()))

/** The address umo.auto gives a dealer */
export const addressOf = (name: string) => dealerOf(name)?.address

/** Every dealer's address, for the address field's suggestions */
export const ADDRESSES = [...new Set(dealers.map(d => d.address))].sort((a, b) => a.localeCompare(b, 'ru'))

/**
 * A dealer's hours as the sign sets them, «9:00», from umo.auto's «ежедневно, 09:00–21:00»; none for the few open
 * different hours on different days, as the sign has one range
 */
export function hoursOf(name: string): { from: string; to: string } | undefined {
  const m = dealerOf(name)?.hours.match(/^ежедневно, (\d\d):(\d\d)–(\d\d):(\d\d)$/)
  return m ? { from: `${+m[1]}:${m[2]}`, to: `${+m[3]}:${m[4]}` } : undefined
}
