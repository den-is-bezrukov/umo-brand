import type { BrandHoursSign } from '@/hours/sign'
import { logo } from '@/card/card'
import { SITE } from '@/site'

// UMO's hours sign: a 480×680 mm plate, the logo at the top, the hours large in the middle with a line under them, and
// the dealership at the bottom: its marketing name («UMO Дилер Город»), address, phone and site. Figma's frame is
// 2400×3400, 5 px a millimetre; the margins and the column are sevenths of the width, the logo as wide as the column.
// All in CoFo Sans Medium. Figma's text boxes are «leading-none», so a baseline is 0.844 of the size under a box's top.

export const SIGN = { w: 480, h: 680 }
export const MARGIN = SIGN.w / 7
const COLUMN = SIGN.w - 2 * MARGIN
const DROP = 0.844

/** The logo across the column, from the top margin */
export const LOGO = logo(MARGIN, MARGIN, COLUMN)
/** The hours, centred: 292.571 px with −0.85% tracking, lining tabular figures and the case forms (the dash raised) */
export const TIME = { size: 292.571 / 5, track: -0.0085, baseline: 1428.571 / 5 + DROP * 292.571 / 5 }
/** The line under them: 155.429 px, −0.8% */
export const LINE = { size: 155.429 / 5, track: -0.008, baseline: 1816 / 5 + DROP * 155.429 / 5 }
/** The dealership: 45.714 px on 1.5 lines, the block standing on its last line (its box's bottom at 3104.571 px) */
export const INFO = { size: 45.714 / 5, leading: 1.5 * 45.714 / 5 }
export const INFO_LAST = 3104.571 / 5 - INFO.leading + (INFO.leading - INFO.size) / 2 + DROP * INFO.size

export const HOURS_SIGN: BrandHoursSign = {
  size: SIGN,
  hours: { placeholder: ['9:00', '21:00'] },
  fields: [
    // The dealer's marketing name as the brand lists it, the brand's name before it fixed
    { id: 'dealer', param: 'name', kind: 'point', label: 'Дилер', placeholder: 'Название дилера', missing: 'Выбрать дилера' },
    { id: 'address', kind: 'address', label: 'Адрес', placeholder: 'Адрес', missing: 'Указать адрес' },
    { id: 'phone', kind: 'phone', label: 'Телефон', placeholder: '+7 495 000 00 00', missing: 'Указать телефон' },
    { id: 'site', kind: 'site', label: 'Сайт', placeholder: 'Сайт', missing: 'Указать сайт' },
  ],
  variants: [{
    label: 'Белый',
    dark: false,
    blocks: [
      { kind: 'logo', x: MARGIN, y: MARGIN, w: COLUMN },
      // Always as wide as Figma's «9:00—21:00» at its size, so that one stands exactly as there, a longer range
      // («10:00—22:00», which would run out of the column) smaller and a shorter one («9:30—7:30») larger, on the same baseline
      { kind: 'hours', x: 'centre', ...TIME, feats: ['case', 'lnum', 'tnum'], dash: '—', minutes: 'always', fit: ['9:00', '21:00'], width: COLUMN },
      // Fixed: nothing a dealer needs to change there
      { kind: 'line', x: 'centre', ...LINE, feats: ['case'], text: 'Работаем без выходных', label: 'Подпись', width: COLUMN },
      {
        kind: 'rows', x: MARGIN, size: INFO.size, leading: INFO.leading, width: COLUMN, bottom: INFO_LAST,
        rows: [
          { text: `${SITE.name} {dealer}`, label: 'Название дилера' },
          // Up to two lines, as the longest the brand lists run to twice the column
          { text: 'Адрес: {address}', label: 'Адрес', lines: 2 },
          { text: 'Телефон: {phone}', label: 'Телефон' },
          { text: '{site}', label: 'Сайт' },
        ],
      },
    ],
  }],
}
