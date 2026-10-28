import type { BrandHoursSign } from '@/hours/sign'

// Evrone's hours sign: an A4 sheet on the office door, black or white, as Figma's «evrone_a4» frames (POS page,
// 2100×2970, 10 px a millimetre) have them, with a phone row the frames lacked. Suisse Int'l Book throughout; 18 mm
// margins, a 174 mm column; the tracking and the case forms as the frames set them. Figma centres the font's hhea box (986 + 311 of 1000) in each line, so a baseline is
// (line − 1.297 × size) / 2 + 0.986 × size under its line's top.

const X = 18
const COLUMN = 174
/** The first baseline of text `size` mm on lines `line` mm, its box's top at `top` */
const baseline = (top: number, size: number, line = size) => top + (line - 1.297 * size) / 2 + 0.986 * size

export const HOURS_SIGN: BrandHoursSign = {
  size: { w: 210, h: 297 },
  hours: { placeholder: ['10:00', '19:00'], default: ['10:00', '19:00'] },
  fields: [
    { id: 'days', kind: 'text', label: 'Выходные', placeholder: 'Сб, Вс — выходной', missing: 'Указать выходные', default: 'Сб, Вс — выходной' },
    { id: 'name', kind: 'text', label: 'Название', placeholder: 'Евроне Девелопмент', missing: 'Указать название', default: 'Евроне Девелопмент' },
    { id: 'legal', kind: 'text', label: 'Юрлицо', placeholder: 'ООО «ЕВРОНЕ Девелопмент»', missing: 'Указать юрлицо', default: 'ООО «ЕВРОНЕ Девелопмент»' },
    { id: 'ogrn', kind: 'text', label: 'ОГРН', placeholder: '1073668003089', missing: 'Указать ОГРН', default: '1073668003089' },
    { id: 'inn', kind: 'text', label: 'ИНН/КПП', placeholder: '3664086233/366401001', missing: 'Указать ИНН/КПП', default: '3664086233/366401001' },
    { id: 'address', kind: 'address', label: 'Адрес', placeholder: 'Воронеж, Короленко 5, пом. 1/7', missing: 'Указать адрес', default: 'Воронеж, Короленко 5, пом. 1/7' },
    { id: 'phone', kind: 'phone', label: 'Телефон', placeholder: '+7 473 000 00 00', missing: 'Указать телефон' },
  ],
  variants: [
    {
      // The name large at the top, the hours in the middle, the company's details small at the bottom
      label: 'Чёрный',
      dark: true,
      blocks: [
        { kind: 'line', x: X, baseline: baseline(18, 27), size: 27, track: -0.035, feats: ['case'], text: '{name}', label: 'Название', width: COLUMN, lines: 2, leading: 27 },
        { kind: 'hours', x: 17.8, baseline: baseline(112.5, 72), size: 72, track: -0.02, feats: ['case'], dash: '–', minutes: 'unlessZero', width: COLUMN },
        { kind: 'line', x: X, baseline: baseline(184.5, 12), size: 12, track: -0.02, text: '{days}', label: 'Выходные', width: COLUMN },
        {
          kind: 'rows', x: X, size: 6, leading: 9, track: -0.02, width: COLUMN, bottom: baseline(252, 6, 9) + 2 * 9,
          rows: [
            { text: '{legal}', label: 'Юрлицо' },
            { text: 'ОГРН {ogrn}; ИНН/КПП {inn}', label: 'ОГРН и ИНН/КПП' },
            { text: '{address}', label: 'Адрес', lines: 2 },
            { text: 'Телефон {phone}', label: 'Телефон' },
          ],
        },
      ],
    },
    {
      // The company large at the top with its details under it, the hours at the bottom
      label: 'Белый',
      dark: false,
      blocks: [
        { kind: 'line', x: X, baseline: baseline(21, 27), size: 27, track: -0.04, text: '{legal:title}', label: 'Юрлицо', width: COLUMN, lines: 3, leading: 27 },
        {
          kind: 'rows', x: X, size: 9, leading: 11.97, width: COLUMN, top: baseline(112.5, 9, 11.97),
          rows: [
            { text: 'ОГРН {ogrn}', label: 'ОГРН' },
            { text: 'ИНН/КПП {inn}', label: 'ИНН/КПП' },
            { text: '{address}', label: 'Адрес', lines: 2 },
            { text: 'Телефон {phone}', label: 'Телефон' },
          ],
        },
        { kind: 'hours', x: X, baseline: baseline(207, 54), size: 54, track: -0.04, feats: ['case'], dash: '–', minutes: 'unlessZero', width: COLUMN },
        { kind: 'line', x: X, baseline: baseline(261, 9, 11.97), size: 9, text: '{days}', label: 'Выходные', width: COLUMN },
      ],
    },
  ],
}
