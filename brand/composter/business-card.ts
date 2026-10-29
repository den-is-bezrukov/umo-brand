import type { BrandBusinessCard } from '@/card/card'

// Компостер's business card, 90×50 mm, as Figma «Composter» has it (Визитка, 10 px a millimetre): UMO's layout set in
// Inter, whose capitals are 0.7275 of the size. Figma sets Inter on 100% lines with the baseline 0.863 of the size
// under a box's top, so the dealership's capitals hang from the 5 mm margin and the phone stands on it, as there. The
// face, white or black: the logo 40.96 mm wide at 5, 37. The back: the dealership at the top in Medium 4 mm, then
// «Официальный дилер …», the address (up to two lines) and the site in Regular 3 mm; the logo 15.36 mm wide in the top
// right corner; the person at the bottom, name and surname in Medium 4 mm, position, email and phone in Regular 3 mm;
// the QR 15×15 in the bottom right corner. 2.3 mm between the capitals under a heading, 2 mm between items.

const MARGIN = 5
const CAP = 0.7275
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
