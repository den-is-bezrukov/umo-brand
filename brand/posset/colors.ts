import type { BrandColors } from '@/brand'




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
  
  ink: [0.6, 0.4, 0.4, 1],
}
