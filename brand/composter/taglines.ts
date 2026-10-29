import type { Vehicle } from '@/livery/surface'

// The livery's bottom text: what Компостер does, offered in the field's suggestions; the same on either vehicle

const TAGLINE = 'Пробивной брендинг'

/** The default, as Figma's «Editor Livery» has it */
export const DEFAULT_TAGLINE: Record<Vehicle, string> = { van: TAGLINE, hatch: TAGLINE }

/** The suggestions per vehicle */
export const TAGLINES: Record<Vehicle, string[]> = {
  van: [TAGLINE, 'Гайд и материалы в одном месте'],
  hatch: [TAGLINE, 'Гайд и материалы в одном месте'],
}
