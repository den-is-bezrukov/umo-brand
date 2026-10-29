import { pointOf } from './points'

// What the points of sale say of a point, for the hours sign

/** The address the brand's points of sale (`@brand/points`) give a point */
export const addressOf = (name: string) => pointOf(name)?.address

/**
 * A point's hours as the sign sets them, «9:00», from the brand's site's «ежедневно, 09:00–21:00»; none for the few open
 * different hours on different days, as the sign has one range
 */
export function hoursOf(name: string): { from: string; to: string } | undefined {
  const m = pointOf(name)?.hours.match(/^ежедневно, (\d\d):(\d\d)–(\d\d):(\d\d)$/)
  return m ? { from: `${+m[1]}:${m[2]}`, to: `${+m[3]}:${m[4]}` } : undefined
}
