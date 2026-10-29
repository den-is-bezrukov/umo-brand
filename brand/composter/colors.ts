import type { BrandColors } from '@/brand'

// Компостер's colours, as Figma «Composter» has them (Основа · Цвет): black and white are the brand's, the colour
// comes from the cars and the photographs; the greys are service ones, the site's own (`theme.css`).

const WHITE: [string, string][] = [['Экран', '#FFFFFF'], ['Печать', 'без краски']]

export const COLORS: BrandColors = {
  main: [
    { name: 'Чёрный', color: '#000000', dark: true, values: [['Экран', '#000000'], ['Печать, фон', 'C60 M40 Y40 K100'], ['Текст', 'K100']] },
    { name: 'Белый', color: '#ffffff', values: WHITE },
  ],
  service: [
    { name: 'Фон', color: '#f5f5f5', values: [['Экран', '#F5F5F5'], ['Печать', 'K4']] },
    { name: 'Линии', color: '#e6e6e6', values: [['Экран', '#E6E6E6'], ['Печать', 'K10']] },
    { name: 'Подписи', color: '#808080', dark: true, values: [['Экран', '#808080'], ['Печать', 'K50']] },
  ],
  // Чёрный's «Печать, фон»: the livery, the name tag, the hours sign, the business card's black face
  ink: [0.6, 0.4, 0.4, 1],
}
