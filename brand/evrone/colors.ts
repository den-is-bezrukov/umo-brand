import type { BrandColors } from '@/brand'

// Evrone's colours, as Figma's «evrone_colors» and evrone.com have them: black and orange, white and sand. The print
// values are the print files' own: the business card's black ground (C60 M40 Y40 K100) and text (K100), the Welcome
// Box's orange (C0 M90 Y100 K0). The sand has no print file yet, so no print value.

export const COLORS: BrandColors = {
  main: [
    { name: 'Чёрный', color: '#000000', dark: true, values: [['Экран', '#000000'], ['Печать, фон', 'C60 M40 Y40 K100'], ['Текст', 'K100']] },
    { name: 'Оранжевый', color: '#ff4400', dark: true, values: [['Экран', '#FF4400'], ['Печать', 'C0 M90 Y100 K0']] },
  ],
  service: [
    { name: 'Белый', color: '#ffffff', values: [['Экран', '#FFFFFF'], ['Печать', 'без краски']] },
    { name: 'Песочный', color: '#eeddcc', values: [['Экран', '#EEDDCC']] },
  ],
  // Чёрный's «Печать, фон»: the business card's black face, the hours sign
  ink: [0.6, 0.4, 0.4, 1],
}
