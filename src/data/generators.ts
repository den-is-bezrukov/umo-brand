// Every generator, in alphabetical order: the generators' ring and «Инструкция» (`src/ui/form.tsx`), the guide's
// «Редактор материалов» window, and the guide's grid of Материалы, which draws a card of its own for a generator it
// has no picture for (`row`, the ↗ row under it; the picture its generator's `GENERATED` one in `Guide.tsx`), and the
// list in Материалы' first sentence (`phrase`, what it makes, as that sentence names it). `template`: the blank
// template its `?t` link saves, named and sized under its card in Материалы (the size measured off the file, ±10 КБ as
// the generator changes; measure again when it changes much)
type Template = { file: string; size: number }
export const GENERATORS: { path: string; title: string; phrase: string; row?: string; template?: Template }[] = [
  { path: '/name-tag', title: 'Бейдж', phrase: 'бейдж сотрудника', template: { file: 'UMO_name-tags_template.pdf', size: 235241 } },
  { path: '/business-card', title: 'Визитка', phrase: 'визитка', template: { file: 'UMO_business-cards_template.pdf', size: 237707 } },
  { path: '/livery', title: 'Ливрея', phrase: 'ливрея демо-автомобиля', template: { file: 'UMO5_dealer-livery_template.pdf', size: 236923 } },
  { path: '/memo', title: 'Памятка', phrase: 'памятка владельца', row: 'Подготовить памятку', template: { file: 'UMO_owner-memo_template.pdf', size: 250603 } },
  { path: '/price-card', title: 'Прайс-карта', phrase: 'прайс-карта', template: { file: 'UMO_price-card_template.pdf', size: 24814 } },
  { path: '/plate-frame', title: 'Рамка номера', phrase: 'рамка\u00a0номера', template: { file: 'UMO_plate-frame_template.pdf', size: 229800 } },
  { path: '/hours-sign', title: 'Режимник', phrase: 'режимник', template: { file: 'UMO_hours-sign_template.pdf', size: 235456 } },
  { path: '/price-tag', title: 'Ценник', phrase: 'ценник', template: { file: 'UMO_price-tags_template.pdf', size: 238578 } },
]
