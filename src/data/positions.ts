// Typical positions at a dealership, in alphabetical order, offered by the position field (a combobox: free text stays allowed).
// A draft to be corrected by the brand team. A line break here is where the name tag and the business card break the
// position (`withListBreak`), as the source sets «Продавец-консультант / новых автомобилей»; every line fits the 62 mm.
// The field gets it on one line (`POSITION_OPTIONS`): the break is the layout's, not the text's

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

/** The suggestions as the field takes them, on one line */
export const POSITION_OPTIONS = POSITIONS.map(p => p.replace(/\s*\n\s*/g, ' '))

const oneLine = (t: string) => t.replace(/\s+/g, ' ').trim().toLowerCase()

/** A position typed on one line that is in the list takes the list's line break */
export function withListBreak(position: string): string {
  if (position.includes('\n')) return position
  return POSITIONS.find(p => oneLine(p) === oneLine(position)) ?? position
}
