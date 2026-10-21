import type { BrandColors } from '@/brand'

// UMO's colours: black and white, and the greys the site and the materials are built with. The greys are also the
// site's own (`theme.css`: surface, line, caption), so these are the same values.

const WHITE: [string, string][] = [['Экран', '#FFFFFF'], ['На светлом', 'без краски'], ['На тёмном', 'белая краска']]

export const COLORS: BrandColors = {
  main: [
    { name: 'Чёрный', color: '#000000', dark: true, values: [['Экран', '#000000'], ['Плёнка, вывески', 'C60 M40 Y40 K100'], ['Текст', 'K100']] },
    { name: 'Белый', color: '#ffffff', values: WHITE },
  ],
  service: [
    { name: 'Фон', color: '#f5f5f5', values: [['Экран', '#F5F5F5'], ['Печать', 'K4']] },
    { name: 'Линии', color: '#e6e6e6', values: [['Экран', '#E6E6E6'], ['Печать', 'K10']] },
    { name: 'Подписи', color: '#808080', dark: true, values: [['Экран', '#808080'], ['Печать', 'K50']] },
  ],
}
