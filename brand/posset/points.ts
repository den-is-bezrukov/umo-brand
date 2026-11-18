import type { BrandPoints } from '@/brand'

/** POSSET's demo offices, made up for the demo: three cities, the street a placeholder, the hours as the core reads them */
export const POINTS: BrandPoints = {
  lists: [[
    { name: 'POSSET Москва', city: 'Москва', address: 'Москва, ул. Примерная, 1', hours: '10:00–20:00', phone: '+7 495 000 00 01' },
    { name: 'POSSET Санкт-Петербург', city: 'Санкт-Петербург', address: 'Санкт-Петербург, ул. Примерная, 2', hours: '10:00–20:00', phone: '+7 812 000 00 02' },
    { name: 'POSSET Казань', city: 'Казань', address: 'Казань, ул. Примерная, 3', hours: '9:00–21:00', phone: '+7 843 000 00 03' },
  ]],
  prefix: 'POSSET',
  words: ['posset'],
}
