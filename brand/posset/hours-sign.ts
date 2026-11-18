import type { BrandHoursSign } from '@/hours/sign'
import { logo } from '@/card/card'
import { SITE } from '@/site'






export const SIGN = { w: 480, h: 680 }
export const MARGIN = SIGN.w / 7
const COLUMN = SIGN.w - 2 * MARGIN
const DROP = 0.86377


export const LOGO = logo(MARGIN, MARGIN, COLUMN)

export const TIME = { size: 292.5 / 5, track: -0.0085, baseline: 1597.49 / 5 + DROP * 292.5 / 5 }

export const LINE = { size: 155.5 / 5, track: -0.008, baseline: 1945.76 / 5 + DROP * 155.5 / 5 }

export const INFO = { size: 45.7 / 5, leading: 1.5 * 45.7 / 5 }
export const INFO_LAST = 3075.62 / 5 - INFO.leading + (INFO.leading - INFO.size) / 2 + DROP * INFO.size

export const HOURS_SIGN: BrandHoursSign = {
  size: SIGN,
  
  hours: { placeholder: ['10:00', '19:00'], default: ['10:00', '19:00'], slider: false },
  fields: [
    
    { id: 'point', param: 'name', kind: 'point', label: 'Офис', placeholder: 'Название офиса', missing: 'Выбрать офис' },
    { id: 'address', kind: 'address', label: 'Адрес', placeholder: 'Адрес', missing: 'Указать адрес' },
    { id: 'phone', kind: 'phone', label: 'Телефон', placeholder: '+7 495 000 00 00', missing: 'Указать телефон' },
    { id: 'site', kind: 'site', label: 'Сайт', placeholder: 'Сайт', missing: 'Указать сайт' },
  ],
  variants: [{
    label: 'Белый',
    dark: false,
    blocks: [
      { kind: 'logo', x: MARGIN, y: MARGIN, w: COLUMN },
      { kind: 'hours', x: 'centre', ...TIME, feats: ['case', 'lnum', 'tnum'], dash: '—', minutes: 'always', fit: ['10:00', '19:00'], width: COLUMN },
      { kind: 'line', x: 'centre', ...LINE, feats: ['case'], text: 'Работаем без выходных', label: 'Подпись', width: COLUMN },
      {
        kind: 'rows', x: MARGIN, size: INFO.size, leading: INFO.leading, width: COLUMN, bottom: INFO_LAST,
        rows: [
          { text: `${SITE.name} {point}`, label: 'Название офиса' },
          { text: 'Адрес: {address}', label: 'Адрес', lines: 2 },
          { text: 'Телефон: {phone}', label: 'Телефон' },
          { text: '{site}', label: 'Сайт' },
        ],
      },
    ],
  }],
}
