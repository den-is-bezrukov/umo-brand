import type { BrandHoursSign } from '@/hours/sign'
import { logo } from '@/card/card'
import { SITE } from '@/site'

// Компостер's hours sign, as Figma «Composter» has it (Режимник): UMO's plate, 480×680 mm, set in Inter. Figma's frame is
// 2400×3400, 5 px a millimetre; the margins and the column are sevenths of the width, the logo as wide as the column.
// Figma sets Inter with the hhea box centred on the line, so a baseline is the line's top plus (line − 1.21 × size) / 2
// plus 0.969 × size: on 100% lines 0.864 of the size (`DROP`). The hours by a slider (`hours.slider`).

export const SIGN = { w: 480, h: 680 }
export const MARGIN = SIGN.w / 7
const COLUMN = SIGN.w - 2 * MARGIN
const DROP = 0.86377

/** The logo across the column, from the top margin */
export const LOGO = logo(MARGIN, MARGIN, COLUMN)
/** The hours, centred: 292.5 px with −0.85% tracking, lining tabular figures and the case forms (the dash raised) */
export const TIME = { size: 292.5 / 5, track: -0.0085, baseline: 1597.49 / 5 + DROP * 292.5 / 5 }
/** The line under them: 155.5 px, −0.8% (Regular in Figma; the core sets the sign in Medium) */
export const LINE = { size: 155.5 / 5, track: -0.008, baseline: 1945.76 / 5 + DROP * 155.5 / 5 }
/** The dealership: 45.7 px on 1.5 lines, the block standing on its last line (its box's bottom at 3075.62 px) */
export const INFO = { size: 45.7 / 5, leading: 1.5 * 45.7 / 5 }
export const INFO_LAST = 3075.62 / 5 - INFO.leading + (INFO.leading - INFO.size) / 2 + DROP * INFO.size

export const HOURS_SIGN: BrandHoursSign = {
  size: SIGN,
  // A slider has no empty hours: it starts where its knobs stand
  hours: { placeholder: ['9:00', '21:00'], default: ['9:00', '21:00'], slider: true },
  fields: [
    // The branch's name, the brand's name before it fixed
    { id: 'point', param: 'name', kind: 'point', label: 'Филиал', placeholder: 'Название филиала', missing: 'Выбрать филиал' },
    { id: 'address', kind: 'address', label: 'Адрес', placeholder: 'Адрес', missing: 'Указать адрес' },
    { id: 'phone', kind: 'phone', label: 'Телефон', placeholder: '+7 495 000 00 00', missing: 'Указать телефон' },
    { id: 'site', kind: 'site', label: 'Сайт', placeholder: 'Сайт', missing: 'Указать сайт' },
  ],
  variants: [{
    label: 'Белый',
    dark: false,
    blocks: [
      { kind: 'logo', x: MARGIN, y: MARGIN, w: COLUMN },
      { kind: 'hours', x: 'centre', ...TIME, feats: ['case', 'lnum', 'tnum'], dash: '—', minutes: 'always', fit: ['9:00', '21:00'], width: COLUMN },
      { kind: 'line', x: 'centre', ...LINE, feats: ['case'], text: 'Работаем без выходных', label: 'Подпись', width: COLUMN },
      {
        kind: 'rows', x: MARGIN, size: INFO.size, leading: INFO.leading, width: COLUMN, bottom: INFO_LAST,
        rows: [
          { text: `${SITE.name} {point}`, label: 'Название филиала' },
          { text: 'Адрес: {address}', label: 'Адрес', lines: 2 },
          { text: 'Телефон: {phone}', label: 'Телефон' },
          { text: '{site}', label: 'Сайт' },
        ],
      },
    ],
  }],
}
