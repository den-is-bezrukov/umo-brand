// Every generator, in alphabetical order: the generators' ring and «Инструкция» (`src/ui/form.tsx`), the guide's
// «Редактор материалов» window, and the guide's grid of Материалы, which draws a card of its own for a generator it
// has no picture for (`row`, the ↗ row under it; the picture its generator's `GENERATED` one in `Guide.tsx`), and the
// list in Материалы' first sentence (`phrase`, what it makes, as that sentence names it). `templates`: the blank
// templates its `?t` link saves (`query` before it for another one, the livery's UMO 8), under its card in Материалы as
// `label` (the file's own name, with its «_template», stays apart from the print file's), PDF on its right
type Template = { label: string; file: string; query?: string }
// `of`: what it makes, as «Шаблон …» names it (the genitive: «бейджа»), for the template icon's tooltip («Скачать
// шаблон бейджа», `templateTitle`) and its templates' `label` in Материалы unless they have their own (the livery's
// models); `one`: one of what it makes, as «Добавить …» names it (the accusative: «визитку»), for the plus's tooltip
// (`addTitle`); a new generator can't go without either
type Generator = { path: string; title: string; phrase: string; of: string; one: string; row?: string; templates?: (Omit<Template, 'label'> & { label?: string })[] }
const LIST: Generator[] = [
  { path: '/name-tag', title: 'Бейдж', phrase: 'бейдж сотрудника', of: 'бейджа', one: 'бейдж', templates: [{ file: 'UMO_name-tags_template.pdf' }] },
  { path: '/business-card', title: 'Визитка', phrase: 'визитка', of: 'визитки', one: 'визитку', templates: [{ file: 'UMO_business-cards_template.pdf' }] },
  { path: '/livery', title: 'Ливрея', phrase: 'ливрея демо-автомобиля', of: 'ливреи', one: 'ливрею', templates: [{ file: 'UMO5_dealer-livery_template.pdf' }] },
  { path: '/memo', title: 'Памятка', phrase: 'памятка владельца', of: 'памятки', one: 'памятку', row: 'Подготовить памятку', templates: [{ file: 'UMO_owner-memo_template.pdf' }] },
  { path: '/price-card', title: 'Прайс-карта', phrase: 'прайс-карта', of: 'прайс-карты', one: 'прайс-карту', templates: [{ file: 'UMO_price-cards.pdf' }] },
  { path: '/plate-frame', title: 'Рамка номера', phrase: 'рамка\u00a0номера', of: 'рамки номера', one: 'рамку номера', templates: [{ file: 'UMO_plate-frame_template.pdf' }] },
  { path: '/hours-sign', title: 'Режимник', phrase: 'режимник', of: 'режимника', one: 'режимник', templates: [{ file: 'UMO_hours-sign_template.pdf' }] },
  { path: '/price-tag', title: 'Ценник', phrase: 'ценник', of: 'ценника', one: 'ценник', templates: [{ file: 'UMO_price-tags_template.pdf' }] },
]
export const GENERATORS = LIST.map(g => ({ ...g, templates: g.templates?.map(t => ({ ...t, label: t.label ?? `Шаблон ${g.of}` })) }))

/** The template icon's tooltip on the generator at `path`: «Скачать шаблон бейджа» */
export const templateTitle = (path: string) => {
  const g = LIST.find(g => g.path === path)
  return g ? `Скачать шаблон ${g.of}` : 'Скачать шаблон'
}

/** An item on the generator at `path` as the screen readers' names of its actions say it: «визитку 2» («Удалить
 * визитку 2»), its number while there are several; `of` the genitive («Скачать шаблон визитки 2») */
export const itemName = (path: string, n?: number, of = false) => {
  const g = LIST.find(g => g.path === path)
  const word = g ? (of ? g.of : g.one) : ''
  return [word, n].filter(Boolean).join(' ')
}

/** Материалы' card row while its PDF is pointed at: «Скачать визитку» */
export const downloadTitle = (path: string) => {
  const g = LIST.find(g => g.path === path)
  return g ? `Скачать ${g.one}` : 'Скачать'
}

/** A link into the generator at `path`, its tooltip: «Редактировать визитку» */
export const editTitle = (path: string) => {
  const g = LIST.find(g => g.path === path)
  return g ? `Редактировать ${g.one}` : 'Редактировать'
}

/** The plus's tooltip («Добавить») on the generator at `path`: «Добавить визитку» */
export const addTitle = (path: string) => {
  const g = LIST.find(g => g.path === path)
  return g ? `Добавить ${g.one}` : 'Добавить'
}
