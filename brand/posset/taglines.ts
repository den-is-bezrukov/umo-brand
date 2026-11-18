import type { Vehicle } from '@/livery/surface'


const TAGLINE = 'Пробивной брендинг'

/** The default, as Figma's «Editor Livery» has it */
export const DEFAULT_TAGLINE: Record<Vehicle, string> = { van: TAGLINE, hatch: TAGLINE }

/** The suggestions per vehicle */
export const TAGLINES: Record<Vehicle, string[]> = {
  van: [TAGLINE, 'Гайд и материалы в одном месте'],
  hatch: [TAGLINE, 'Гайд и материалы в одном месте'],
}
