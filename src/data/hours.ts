import { pointOf } from './points'

// What the points of sale say of a point, for the hours sign

/** The address the brand's points of sale (`@brand/points`) give a point */
export const addressOf = (name: string) => pointOf(name)?.address

/**
 * A point's hours as the sign sets them, «9:00», from its `hours`, «9:00–21:00» every day; none for a point without
 * one range (the sign has one)
 */
export function hoursOf(name: string): { from: string; to: string } | undefined {
  const m = pointOf(name)?.hours.match(/^(\d{1,2}):(\d\d)–(\d{1,2}):(\d\d)$/)
  return m ? { from: `${+m[1]}:${m[2]}`, to: `${+m[3]}:${m[4]}` } : undefined
}
