import type { BrandPriceTag } from '@/pricetag/tag'

/** No price tag of the brand's own: a plain one */
export const PRICE_TAG: BrandPriceTag = {
  size: { w: 90, h: 60 },
  side: 4,
  band: 12,
  logo: { w: 15 },
  rule: { x: 22, w: 0.15, h: 3 },
  point: { gap: 3, size: 4.4 },
  name: { top: 4, size: 4.5, lines: 4 },
  small: 3,
  tracking: 0,
  code: 26,
  caption: 30.5,
  price: { top: 35, size: 9 },
}
