import type { BrandColors } from '@/brand'

// Evrone's colours, as Figma's «evrone_colors» and evrone.com have them: black, white, the orange and the sand.

export const COLORS: BrandColors = {
  main: [
    { name: 'Чёрный', color: '#000000', dark: true, values: [['Экран', '#000000']] },
    { name: 'Оранжевый', color: '#ff4400', dark: true, values: [['Экран', '#FF4400']] },
  ],
  service: [
    { name: 'Белый', color: '#ffffff', values: [['Экран', '#FFFFFF']] },
    { name: 'Песочный', color: '#eeddcc', values: [['Экран', '#EEDDCC']] },
  ],
}
