import type { BrandFonts } from '@/brand'

/** CoFo Sans, Regular and Medium: the generators' files and templates, as the site (`theme.css`) */
export const FONTS: BrandFonts = {
  short: 'CoFo',
  regular: { file: 'fonts/CoFoSans-Regular.ttf', name: 'CoFoSans-Regular' },
  medium: { file: 'fonts/CoFoSans-Medium.ttf', name: 'CoFoSans-Medium' },
}

/** Alice Okniks (`theme.css`): Alice's mark on @, a thin no-break space, for the price card's Alice line */
export const ALICE = 'fonts/AliceOkniks.woff'
