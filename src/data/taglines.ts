import type { Model } from '@/livery/layout'

// The livery's bottom text: what each model is, offered in the field's suggestions. Entries match across the models by
// their place in the list, so switching models swaps a picked one for the other model's

/** The default names what each model is */
export const DEFAULT_TAGLINE: Record<Model, string> = {
  umo8: 'Попробуй гибрид с технологиями Яндекса',
  umo5: 'Попробуй электрокар с технологиями Яндекса',
}

/** The suggestions per model: the default, the same without «Попробуй», then the shorter ones */
export const TAGLINES: Record<Model, string[]> = {
  umo8: [DEFAULT_TAGLINE.umo8, 'Гибрид с технологиями Яндекса', 'Гибрид с Яндексом внутри'],
  umo5: [DEFAULT_TAGLINE.umo5, 'Электрокар с технологиями Яндекса', 'Электрокар с Яндексом внутри'],
}
