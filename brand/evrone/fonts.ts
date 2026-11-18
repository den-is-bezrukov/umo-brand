import type { BrandFonts } from '@/brand'

/** Suisse Int'l Book, the one weight: the generators set everything in it, as the site (`theme.css`) */
const BOOK = { file: 'fonts/SuisseIntl-Book.ttf', name: 'SuisseIntl-Book' }

export const FONTS: BrandFonts = { family: "Suisse Int'l", short: 'Suisse', regular: BOOK, medium: BOOK, metrics: { cap: 0.68, ascent: 0.974, descent: 0.286, descender: 0.194 } }
