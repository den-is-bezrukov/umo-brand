import type { BrandNameTag } from '@/nametag/tag'

// UMO's name tag: its layout and logo, as the tag's source PDF draws them (`src/nametag/tag.ts` lays the tag out).

/**
 * A 70×25 mm plate with 4 mm rounded corners, the name and surname in Medium 14 pt on 12 pt lines, the position in
 * Regular 9 pt on 10.8 pt lines, both from the left margin of 4 mm, and the logo 20×4 mm in the top right corner, 4 mm
 * from the edges; every number measured off that PDF. The name keeps 2 mm clear of the logo's column (40 mm: half the
 * 4 mm margin, so Преображенский, 39.6 mm, fits; Александровская, 40.3 mm, is an error). The position's baseline is the
 * source's first line's, 17.4166 mm; the last stands a leading lower, at the source's second (21.23 mm)
 */
export const NAME_TAG: BrandNameTag = {
  size: { w: 70, h: 25, r: 4 },
  margin: 4,
  logoX: 46,
  name: { pt: 14, leading: 12, baseline: 7.6486, clear: 2 },
  position: { pt: 9, leading: 10.8, baseline: 17.4166 },
}

/** The wordmark as the name tag's source PDF draws it: 20×4 mm, 4 mm in from the tag's top right corner, in the tag's millimetres */
export const NAME_TAG_LOGO = 'M61.6 6.55L64.5 6.55L64.5 5.445L61.6 5.45ZM64.499 4C65.512 4 66 4.418 66 5.445L66 6.555C66 7.582 65.512 8 64.499 8L61.601 8C60.588 8 60.1 7.582 60.1 6.555L60.1 5.445C60.1 4.419 60.588 4 61.601 4ZM50.1 6.55L47.5 6.55L47.5 4L46 4L46 6.555C46 7.582 46.488 8 47.501 8L50.099 8C51.112 8 51.6 7.582 51.6 6.555L51.6 4L50.1 4ZM58.1 4C59.112 4 59.6 4.418 59.6 5.445L59.6 8L58.1 8L58.1 5.45L56.6 5.45L56.6 8L55.1 8L55.1 5.45L56.6 5.45L56.6 4ZM55.1 5.45L53.6 5.45L53.6 8L52.1 8L52.1 5.445C52.1 4.419 52.587 4 53.6 4L55.1 4Z'
