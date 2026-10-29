import type { BrandPoints } from '@/brand'

/** Компостер's branches, made up for the demo: three cities, the street a placeholder, the hours as the core reads them */
export const POINTS: BrandPoints = {
  lists: [[
    { name: 'Компостер Москва', city: 'Москва', address: 'Москва, ул. Примерная, 1', hours: 'ежедневно, 10:00–20:00', phone: '+7 495 000 00 01' },
    { name: 'Компостер Санкт-Петербург', city: 'Санкт-Петербург', address: 'Санкт-Петербург, ул. Примерная, 2', hours: 'ежедневно, 10:00–20:00', phone: '+7 812 000 00 02' },
    { name: 'Компостер Казань', city: 'Казань', address: 'Казань, ул. Примерная, 3', hours: 'ежедневно, 9:00–21:00', phone: '+7 843 000 00 03' },
  ]],
  prefix: 'Компостер',
  words: ['компостер', 'composter'],
}
