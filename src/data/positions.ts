// Typical positions at a dealership, in alphabetical order, offered by the position field (a native <datalist>: free text stays allowed).
// A draft to be corrected by the brand team. A line break here is where the tag breaks the position when it's picked
// from the list, as the source sets «Продавец-консультант / новых автомобилей»; every line fits the 62 mm.

export const POSITIONS = [
  'Администратор',
  'Гарантийный инженер',
  'Директор дилерского центра',
  'Директор по продажам',
  'Директор по сервису',
  'Мастер-консультант',
  'Мастер-приёмщик',
  'Менеджер по запасным частям',
  'Менеджер по корпоративным продажам',
  'Менеджер по кредитованию\nи страхованию',
  'Менеджер по продаже\nдополнительного оборудования',
  'Менеджер по работе с клиентами',
  'Менеджер по тест-драйвам',
  'Продавец-консультант\nавтомобилей с пробегом',
  'Продавец-консультант\nновых автомобилей',
  'Руководитель отдела продаж',
  'Руководитель сервиса',
  'Специалист по трейд-ин',
]

const oneLine = (t: string) => t.replace(/\s+/g, ' ').trim().toLowerCase()

/** A position typed on one line that is in the list takes the list's line break */
export function withListBreak(position: string): string {
  if (position.includes('\n')) return position
  return POSITIONS.find(p => oneLine(p) === oneLine(position)) ?? position
}
