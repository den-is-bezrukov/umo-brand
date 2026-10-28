import type { BrandBusinessCard } from '@/card/card'

// UMO's business card, 90×50 mm, as Figma has it (10 px a millimetre; Figma trims text boxes to the capitals, 680 of
// 1000 units, so its numbers are cap tops and baselines). The face is the logo 40×8 mm in the bottom left corner. The
// back, within 5 mm margins: the dealership at the top, hanging from the top margin — its name in Medium 4 mm, then
// «Официальный дилер UMO», the address (up to two lines) and the site in Regular 3 mm, the logo 15×3 in the top right
// corner level with the name's capitals — and the person at the bottom, standing on the bottom margin: name and surname
// on one line of Medium 4 mm, then position (up to two lines), email and phone in Regular 3 mm, the QR 15×15 in the
// bottom right corner. 2.3 mm between the capitals under a heading, 2 mm between items, 100% leading inside one.

const MARGIN = 5
const CAP = 0.68
const BIG = 4
const SMALL = 3

export const BUSINESS_CARD: BrandBusinessCard = {
  size: { w: 90, h: 50 },
  cap: CAP,
  faces: [{ label: 'Белая', dark: false, logo: { x: MARGIN, y: 50 - MARGIN - 8, w: 40 } }],
  logo: { x: 90 - MARGIN - 15, y: MARGIN, w: 15 },
  qr: { x: 70, y: 30, size: 15 },
  dealer: { x: MARGIN, top: MARGIN, name: BIG, size: SMALL, width: 65, addressWidth: 80, afterName: 2.3 + CAP * SMALL, pitch: 2 + CAP * SMALL, leading: SMALL },
  person: {
    x: MARGIN, bottom: 50 - MARGIN, size: SMALL, width: 60, pitch: 2 + CAP * SMALL, leading: SMALL,
    position: { lines: 2 },
    name: { size: BIG, width: 60, afterPosition: 2.3 + CAP * SMALL },
  },
}
