import type { BrandBusinessCard } from '@/card/card'









const MARGIN = 5
const CAP = 0.72
const BIG = 4
const SMALL = 3
const FACE = { x: MARGIN, y: 37, w: 40.96 }

export const BUSINESS_CARD: BrandBusinessCard = {
  size: { w: 90, h: 50 },
  cap: CAP,
  faces: [
    { label: 'Белая', dark: false, logo: FACE },
    { label: 'Чёрная', dark: true, logo: FACE },
  ],
  logo: { x: 70, y: MARGIN, w: 15.36 },
  qr: { x: 70, y: 30, size: 15 },
  point: { x: MARGIN, top: MARGIN, name: BIG, size: SMALL, width: 65, addressWidth: 80, afterName: 2.3 + CAP * SMALL, pitch: 2 + CAP * SMALL, leading: SMALL },
  person: {
    x: MARGIN, bottom: 50 - MARGIN, size: SMALL, width: 60, pitch: 2 + CAP * SMALL, leading: SMALL,
    position: { lines: 2 },
    name: { size: BIG, width: 60, afterPosition: 2.3 + CAP * SMALL },
  },
}
