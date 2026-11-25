import { POSITIONS } from '@brand/positions'

// The brand's positions (`@brand/positions`), offered by the position field (a combobox: free text stays allowed). A line
// break in one is where the name tag and the business card break the position (`withListBreak`); the field gets it on
// one line (`POSITION_OPTIONS`): the break is the layout's, not the text's

export { POSITIONS }

/** The suggestions as the field takes them, on one line */
export const POSITION_OPTIONS = POSITIONS.map(p => p.replace(/\s*\n\s*/g, ' '))

const oneLine = (t: string) => t.replace(/\s+/g, ' ').trim().toLowerCase()

/** A position typed on one line that is in the list takes the list's line break */
export function withListBreak(position: string): string {
  if (position.includes('\n')) return position
  return POSITIONS.find(p => oneLine(p) === oneLine(position)) ?? position
}
