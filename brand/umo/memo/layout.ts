import type { BrandMemo } from '@/memo/text'

/**
 * Two A4 pages in Figma px, 10 a millimetre. The contacts are two columns 90 mm apart from 15 mm in and 252 mm down:
 * the point's column ends at 2820 (its five lines from 2520) and grows up; the columns stand on twelve of 150 px across
 * the 1800 px text: six and six (the point's measure 50 px clear of the consultant, as the second page's two columns of
 * features), or, `wide`, eight and four, for an address that takes a third line in six. The first line Medium 4,5 mm
 * on 5,985 mm lines, the rest Regular 3,6 mm on 4,5, each 1,5 mm under the one before; a list's indent 5,5 mm, its
 * number ending 1,3 mm short of the text
 */
export const MEMO_LAYOUT: BrandMemo = {
  page: { w: 2100, h: 2970 },
  bottom: 2820,
  columns: {
    even: { point: [150, 850], person: [1050, 850] },
    wide: { point: [150, 1150], person: [1350, 600] },
  },
  gap: 15,
  head: { size: 45, lineHeight: 59.85 },
  body: { size: 36, lineHeight: 45 },
  indent: 55,
  markerGap: 13,
}
