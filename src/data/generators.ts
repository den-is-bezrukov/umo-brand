// Every generator, in alphabetical order: the generators' ring and «Инструкция» (`src/ui/form.tsx`), the guide's
// «Редактор материалов» window, and the guide's grid of Материалы, which draws a card of its own for a generator it
// has no picture for (`row`, the ↗ row under it; the picture its generator's `GENERATED` one in `Guide.tsx`)
export const GENERATORS: { path: string; title: string; row?: string }[] = [
  { path: '/name-tag', title: 'Бейдж' },
  { path: '/business-card', title: 'Визитка' },
  { path: '/livery', title: 'Ливрея' },
  { path: '/memo', title: 'Памятка', row: 'Подготовить памятку' },
  { path: '/price-card', title: 'Прайс-карта' },
  { path: '/plate-frame', title: 'Рамка номера' },
  { path: '/hours-sign', title: 'Режимник' },
  { path: '/price-tag', title: 'Ценник' },
]
