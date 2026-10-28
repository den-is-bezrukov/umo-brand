import type { BrandBusinessCard } from '@/card/card'

/** No business card: a plain one, never shown */
export const BUSINESS_CARD: BrandBusinessCard = {
  size: { w: 90, h: 50 },
  cap: 0.7,
  faces: [{ label: 'Белая', dark: false, logo: { x: 5, y: 37, w: 40 } }],
  qr: { x: 70, y: 30, size: 15 },
  person: { x: 5, bottom: 45, size: 3, width: 60, pitch: 4, leading: 3, position: { lines: 2 }, name: { size: 4, width: 60, afterPosition: 4.3 } },
}
