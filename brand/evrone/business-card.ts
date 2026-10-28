import type { BrandBusinessCard } from '@/card/card'

// Evrone's business card, 85×55 mm, as Yandex Disk's evrone-bc_iugu.pdf has it, measured off it to a hundredth of a
// millimetre. The face is the logo 50 mm wide in the middle, black on white (the default) or white on black. The back, within 6 mm
// margins: name and surname on two lines of 12.7 mm (36 pt) at 100%, from the top; at the bottom the QR 13×13 and,
// right of it, «Evrone / position», email and phone in 4.233 mm (12 pt), the first line's capitals level with the
// QR's top, the last line on its bottom. Suisse Int'l Book, cap height 725 of 1000.

const MARGIN = 6
const LOGO_W = 50
const LOGO_H = LOGO_W * 297.143 / 1600
const logo = { x: (85 - LOGO_W) / 2, y: (55 - LOGO_H) / 2, w: LOGO_W }
const SMALL = 12 * 25.4 / 72

export const BUSINESS_CARD: BrandBusinessCard = {
  size: { w: 85, h: 55 },
  cap: 0.725,
  faces: [{ label: 'Белая', dark: false, logo }, { label: 'Чёрная', dark: true, logo }],
  qr: { x: MARGIN, y: 55 - MARGIN - 13, size: 13 },
  person: {
    x: 23, bottom: 55 - MARGIN, size: SMALL, width: 85 - MARGIN - 23, pitch: (13 - 0.725 * SMALL) / 2, leading: SMALL,
    position: { lines: 1, prefix: 'Evrone / ' },
    name: { size: 36 * 25.4 / 72, width: 85 - 2 * MARGIN, x: MARGIN, baseline: 15.957, pitch: 36 * 25.4 / 72 },
  },
}
