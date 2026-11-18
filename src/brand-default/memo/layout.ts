import type { BrandMemo } from '@/memo/text'

/** No memo of the brand's own: a plain A4 sheet */
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
