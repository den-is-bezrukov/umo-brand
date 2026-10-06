// Typical positions at a dealership, offered under the position field (a native <datalist>: free text stays allowed).
// A draft to be corrected by the brand team. A line break here is where the tag breaks the position when it's picked
// from the list, as the source sets «Продавец-консультант / новых автомобилей»; every line fits the 62 mm.

export const POSITIONS = [
  'Продавец-консультант\nновых автомобилей',
  'Продавец-консультант\nавтомобилей с пробегом',
  'Руководитель отдела продаж',
  'Директор по продажам',
  'Менеджер по кредитованию\nи страхованию',
  'Специалист по трейд-ин',
  'Менеджер по корпоративным продажам',
  'Менеджер по продаже\nдополнительного оборудования',
  'Менеджер по тест-драйвам',
  'Мастер-консультант',
  'Мастер-приёмщик',
  'Руководитель сервиса',
  'Директор по сервису',
  'Гарантийный инженер',
  'Менеджер по запасным частям',
  'Менеджер по работе с клиентами',
  'Администратор',
  'Директор дилерского центра',
]

const oneLine = (t: string) => t.replace(/\s+/g, ' ').trim().toLowerCase()

/** A position typed on one line that is in the list takes the list's line break */
export function withListBreak(position: string): string {
  if (position.includes('\n')) return position
  return POSITIONS.find(p => oneLine(p) === oneLine(position)) ?? position
}
