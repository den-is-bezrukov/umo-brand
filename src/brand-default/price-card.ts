import type { BrandPriceCard } from '@/pricecard/card'

/** No price card of the brand's own: no models on it, a plain sheet */
export const PRICE_CARD: BrandPriceCard = {
  layout: {
    size: { w: 2100, h: 2970 }, side: 125, bottom: 100, band: 720,
    from: { top: 539, lineHeight: 56.25 }, headline: { top: 820, size: 150 },
    body: 75, label: 50, price: 125, legal: 25, listIndent: 75, bullet: 5.8,
    afterHeadline: 100, afterTrim: 50, itemGap: 25, minGap: 75, legalGap: 75, row: 200, qr: 200, priceTop: 75, monthlyGap: 125,
  },
  texts: { from: 'от ', full: 'Полная стоимость', monthly: 'Ежемесячный платёж' },
  headlines: {}, lettering: {}, trims: {},
}
