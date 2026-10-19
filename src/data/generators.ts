// Every generator, in alphabetical order: the generators' ring and «Инструкция» (`src/ui/form.tsx`), the guide's
// «Редактор материалов» window, and the guide's grid of Материалы, which draws a card of its own for a generator it
// has no picture for (`row`, the ↗ row under it; the picture its generator's `GENERATED` one in `Guide.tsx`), and the
// list in Материалы' first sentence (`phrase`, what it makes, as that sentence names it)
export const GENERATORS: { path: string; title: string; phrase: string; row?: string }[] = [
  { path: '/name-tag', title: 'Бейдж', phrase: 'бейдж сотрудника' },
  { path: '/business-card', title: 'Визитка', phrase: 'визитка' },
  { path: '/livery', title: 'Ливрея', phrase: 'ливрея демо-автомобиля' },
  { path: '/memo', title: 'Памятка', phrase: 'памятка владельца', row: 'Подготовить памятку' },
  { path: '/price-card', title: 'Прайс-карта', phrase: 'прайс-карта' },
  { path: '/plate-frame', title: 'Рамка номера', phrase: 'рамка\u00a0номера' },
  { path: '/hours-sign', title: 'Режимник', phrase: 'режимник' },
  { path: '/price-tag', title: 'Ценник', phrase: 'ценник' },
]
