import { dealerOf } from './points'

// The hours sign's texts: the line under the hours, and what the points of sale say of a dealer

/** The line under the hours, fixed, as the source has it */
export const DEFAULT_HOURS_LINE = 'Работаем без выходных'

/** The address the brand's points of sale (`@brand/points`) give a dealer */
export const addressOf = (name: string) => dealerOf(name)?.address

/**
 * A dealer's hours as the sign sets them, «9:00», from the brand's site's «ежедневно, 09:00–21:00»; none for the few open
 * different hours on different days, as the sign has one range
 */
export function hoursOf(name: string): { from: string; to: string } | undefined {
  const m = dealerOf(name)?.hours.match(/^ежедневно, (\d\d):(\d\d)–(\d\d):(\d\d)$/)
  return m ? { from: `${+m[1]}:${m[2]}`, to: `${+m[3]}:${m[4]}` } : undefined
}
