import type { BrandHoursSign } from '@/hours/sign'

/** No hours sign: a blank sheet, never shown */
export const HOURS_SIGN: BrandHoursSign = { size: { w: 210, h: 297 }, hours: { placeholder: ['9:00', '18:00'] }, fields: [], variants: [{ label: 'Белый', dark: false, blocks: [] }] }
