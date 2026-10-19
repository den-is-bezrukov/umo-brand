// Every generator, in alphabetical order: the generators' ring and «Инструкция» (`src/ui/form.tsx`), the guide's
// «Редактор материалов» window, and the guide's grid of Материалы, which draws a card of its own for a generator it
// has no picture for (`row`, the ↗ row under it; the picture its generator's `GENERATED` one in `Guide.tsx`), and the
// list in Материалы' first sentence (`phrase`, what it makes, as that sentence names it). `templates`: the blank
// templates its `?t` link saves (`query` before it for another one, the livery's UMO 8), under its card in Материалы as
// `label` (the file's own name, with its «_template», stays apart from the print file's) and the size measured off the
// file (±10 КБ as the generator changes; measure again when it changes much)
type Template = { label: string; file: string; size: number; query?: string }
// `of`: what it makes, as «Шаблон …» names it (the genitive: «бейджа»), for the template icon's tooltip («Скачать
// шаблон бейджа», `templateTitle`) and its templates' `label` in Материалы unless they have their own (the livery's
// models); a new generator can't go without it
type Generator = { path: string; title: string; phrase: string; of: string; row?: string; templates?: (Omit<Template, 'label'> & { label?: string })[] }
const LIST: Generator[] = [
  { path: '/name-tag', title: 'Бейдж', phrase: 'бейдж сотрудника', of: 'бейджа', templates: [{ file: 'UMO_name-tags_template.pdf', size: 235241 }] },
  { path: '/business-card', title: 'Визитка', phrase: 'визитка', of: 'визитки', templates: [{ file: 'UMO_business-cards_template.pdf', size: 237707 }] },
  { path: '/livery', title: 'Ливрея', phrase: 'ливрея демо-автомобиля', of: 'ливреи', templates: [{ label: 'Шаблон ливреи UMO 5', file: 'UMO5_dealer-livery_template.pdf', size: 236923 }, { label: 'Шаблон ливреи UMO 8', file: 'UMO8_dealer-livery_template.pdf', size: 237162, query: 'model=umo8' }] },
  { path: '/memo', title: 'Памятка', phrase: 'памятка владельца', of: 'памятки', row: 'Подготовить памятку', templates: [{ file: 'UMO_owner-memo_template.pdf', size: 250603 }] },
  { path: '/price-card', title: 'Прайс-карта', phrase: 'прайс-карта', of: 'прайс-карты', templates: [{ file: 'UMO_price-card_template.pdf', size: 24804 }] },
  { path: '/plate-frame', title: 'Рамка номера', phrase: 'рамка\u00a0номера', of: 'рамки номера', templates: [{ file: 'UMO_plate-frame_template.pdf', size: 229800 }] },
  { path: '/hours-sign', title: 'Режимник', phrase: 'режимник', of: 'режимника', templates: [{ file: 'UMO_hours-sign_template.pdf', size: 235456 }] },
  { path: '/price-tag', title: 'Ценник', phrase: 'ценник', of: 'ценника', templates: [{ file: 'UMO_price-tags_template.pdf', size: 238578 }] },
]
export const GENERATORS = LIST.map(g => ({ ...g, templates: g.templates?.map(t => ({ ...t, label: t.label ?? `Шаблон ${g.of}` })) }))

/** The template icon's tooltip on the generator at `path`: «Скачать шаблон бейджа» */
export const templateTitle = (path: string) => {
  const g = LIST.find(g => g.path === path)
  return g ? `Скачать шаблон ${g.of}` : 'Скачать шаблон'
}
