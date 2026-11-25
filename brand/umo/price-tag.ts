import type { BrandPriceTag } from '@/pricetag/tag'

/**
 * 90×60 mm, Figma's frame 900×600. A black band 12 mm tall with the logo 15 mm wide, 4.5 mm in, and a hairline 3 mm
 * (30 px) after it; the point's name 2.625 mm after the hairline (Figma has 3; 2.25 is a touch close), free to run to the
 * tag's right edge, so the longest points the brand lists (61.1 mm) fit. Below it the goods' name, Medium 45 px on 45 px
 * lines, from the body's 4 mm padding down to the code; the code and the caption Regular 30 px with 1% tracking; the
 * price Medium 90 px, its box standing on the body's bottom padding
 */
export const PRICE_TAG: BrandPriceTag = {
  size: { w: 90, h: 60 },
  side: 4.5,
  band: 12,
  logo: { w: 15 },
  rule: { x: 22.5, w: 0.15, h: 3 },
  point: { gap: 2.625, size: 4.4 },
  name: { top: 4, size: 4.5, lines: 4 },
  small: 3,
  tracking: 0.01,
  code: 4 + 22,
  caption: 30.5,
  price: { top: 35, size: 9 },
}
