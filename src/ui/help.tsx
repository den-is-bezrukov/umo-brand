import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTypograf } from '@/guide/typograf'
import { goal } from './metrika'
import Dialog from './Dialog'
import { ChevronIcon } from './icons'
import { SUPPORT_BOT, TEXT_LINK } from './links'

/**
 * «Инструкция», the «?» at the end of the breadcrumbs (as Composter's): one panel for every generator, a tab each and
 * «Общее» for what they share, opened on the current one's: what to do, the table, the print and the usual questions,
 * for a dealer on their own. Help lives here, apart from the controls: no hint texts by them
 */

type Help = {
  /** What the generator makes, one line */
  what: string
  steps: ReactNode[]
  /** The «Из таблицы» mode, for the lists that have one */
  table?: ReactNode[]
  print: ReactNode[]
  /** Question → answer */
  faq: [string, ReactNode][]
}

const SITE: [string, ReactNode] = ['Сайт вида agat-vladimir.umo.auto', 'Его редактор предлагает по названию салона, но такие адреса пока не открываются. Впишите сайт салона или umo.auto.']

/** UMO's support bot, linked as the guide's «Контакты» link it */
const Bot = ({ children }: { children: ReactNode }) => <a href={SUPPORT_BOT} target="_blank" rel="noopener" className={TEXT_LINK}>{children}</a>

/** What every generator shares, the «Общее» tab */
const GENERAL: [string, ReactNode][] = [
  ['Поле со стрелкой — только выбор из списка?', 'Нет. В поле со стрелкой можно печатать, как в обычном: список под ним только подсказывает. Нажмите в поле и впишите своё — название салона, должность, слоган, подпись ценника.'],
  ['Что можно поменять', 'Любое поле. То, что подставилось само — адрес, телефон, часы, сайт, цена, слоган, — правится так же, как остальное.'],
  ['Что не меняется', 'Только части самого макета: логотип, фото и описание машины на прайс-карте, «UMO» на рамке, «Работаем без выходных» на режимнике, «Официальный дилер UMO» на визитке.'],
  ['Чёрная кнопка внизу не скачивает', 'Пока чего-то не хватает, она называет следующий шаг: «Выбрать дилера», «Указать цену». Нажмите — редактор покажет это поле. Цифры рядом, например 1/5, — сколько осталось.'],
  ['Моего салона нет в списке', <>Впишите название сами, как на вывеске. Список берётся с umo.auto, новые салоны появляются в нём позже. Чтобы салон добавили, <Bot>напишите боту поддержки</Bot>.</>],
  ['Как отправить коллеге', '«Поделиться» отправляет ссылку: по ней сразу скачивается готовый файл.'],
  ['Как поправить готовый файл', 'Бейдж, визитку, ценник и режимник: перетащите скачанный файл из «Загрузок» на страницу редактора — всё, что в нём было, откроется снова. Прайс-карту, ливрею и рамку откройте по ссылке из «Поделиться».'],
  ['Можно ли с телефона', 'Да, всё работает в браузере телефона. Но таблицы и отправку файлов в типографию удобнее делать с компьютера.'],
  ['Не нашли ответа', <><Bot>Напишите боту поддержки</Bot>: пришлите снимок экрана с редактором и расскажите, что не получается.</>],
]

const HELP: Record<string, Help> = {
  '/name-tag': {
    what: 'Бейдж сотрудника 70 × 25 мм: имя, фамилия и должность.',
    steps: [
      'Впишите имя, фамилию и должность. Должность можно выбрать из списка под полем или напечатать свою.',
      'Для нескольких сотрудников нажмите «Добавить» или загрузите таблицу.',
      'Нажмите «Скачать ZIP».',
    ],
    table: [
      '«Из таблицы» → «Скачать шаблон таблицы»: колонки Имя, Фамилия, Должность.',
      'Заполните шаблон в Excel, нажмите «Загрузить таблицу или ZIP» или перетащите файл на страницу.',
      'Можно и без шаблона: скопируйте строки в Excel и вставьте в любое поле.',
    ],
    print: [
      'Бейджи не печатают на принтере. Отправьте архив UMO_name-tags.zip изготовителю бейджей: в нём макет, образец и требования.',
      'Скажите: «Бейдж 70 × 25 мм по макету и требованиям из архива».',
    ],
    faq: [
      ['Имя не помещается', 'Шрифт на бейдже не уменьшается. Двойную фамилию перенесите на вторую строку клавишей Enter.'],
      ['Нужно ли отчество', 'Нет. Если вставить ФИО целиком, отчество уберётся само.'],
      ['Поле стало красным', 'В имени только буквы, дефис и точка. Цифры и другие знаки — чаще всего таблица вставилась со сдвигом.'],
    ],
  },
  '/business-card': {
    what: 'Визитка сотрудника 90 × 50 мм, двусторонняя: на лицевой логотип, на обороте салон и сотрудник.',
    steps: [
      'Выберите дилера из списка или впишите своё название: если салон есть в списке, его адрес, сайт и телефон подставятся сами.',
      'Впишите имя, фамилию, должность (из списка или свою), телефон и почту. Добавочный — во второй части поля телефона.',
      'Для нескольких сотрудников нажмите «Добавить» или загрузите таблицу. Салон у всех один.',
      'Нажмите «Скачать PDF».',
    ],
    table: [
      '«Из таблицы» → «Скачать шаблон таблицы»: колонки Имя, Фамилия, Должность, Почта, Телефон, Добавочный.',
      'Заполните шаблон в Excel, нажмите «Загрузить таблицу или PDF» или перетащите файл на страницу.',
      'Можно и без шаблона: скопируйте строки в Excel и вставьте в любое поле.',
    ],
    print: [
      'Визитки печатает типография. Отправьте ей файл UMO_business-cards.pdf и скажите: «Визитки 90 × 50 мм, двусторонние, макет 1:1».',
      'Если типография просит метки реза — поставьте галочку «Метки реза». Если просит лицевую сторону перед каждым оборотом — «Обложка у всех».',
    ],
    faq: [
      ['Где адрес, сайт и QR-код', '«Редактировать» рядом с «Дилер». QR-код ведёт на сайт; другую ссылку для него можно вписать там же.'],
      SITE,
      ['Почта стала красной', 'В адресе смешаны русские и латинские буквы, например русская «о». Перепечатайте его латиницей.'],
    ],
  },
  '/livery': {
    what: 'Наклейки на демо-автомобиль: оба борта и, если нужно, заднее стекло — UMO, модель, салон, слоган и QR-код.',
    steps: [
      'Выберите модель.',
      'Дилер: название салона на бортах. Выберите из списка или напечатайте своё.',
      'Слоган: выберите из списка или напечатайте свой.',
      'QR-код: сайт салона. Без своего сайта он ведёт на страницу модели на umo.auto.',
      'Если нужно, включите «Заднее стекло». Нажмите «Скачать ZIP».',
    ],
    print: [
      'Отправьте архив UMO8_dealer-livery.zip (или UMO5_…) в рекламное производство, которое оклеит машину: в нём наклейки 1:1 и схема расположения.',
      'Скажите: «Плоттерная резка по макету 1:1, цвет плёнки и расположение — по схеме из архива».',
      '«Показать размеры» покажет на машине те же размеры, что в схеме.',
    ],
    faq: [
      ['Текст стал красным', 'Он не помещается или заходит на ручку или шов двери. Сократите его или перенесите строку клавишей Enter.'],
      ['Без QR-кода', 'Буквы станут на треть крупнее. Маленький QR-код («Мельче») читается только вблизи, с полутора метров.'],
    ],
  },
  '/price-card': {
    what: 'Прайс-карта A3 или A4 для машины в салоне: модель, комплектация, цена и QR-код на страницу модели.',
    steps: [
      'Выберите модель и комплектацию: рекомендованная цена подставится сама.',
      'Поменяйте цену, если нужно. «В кредит» добавит вторую цену — по умолчанию на миллион меньше полной.',
      'Для другой машины или комплектации нажмите «Добавить».',
      'Нажмите «Скачать PDF»: каждая карта — отдельная страница.',
    ],
    print: [
      'Ctrl + P, в «Размер бумаги» выберите A3 или A4, затем «Печать». Макет сделан под A3, на A4 он просто уменьшится.',
      'Если цветного принтера нет — передайте файл в копицентр и попросите: «Цветная печать, A3» или «A4».',
    ],
    faq: [
      ['«Цена слишком низкая»', 'Цена на карте — от миллиона рублей. Проверьте, нет ли лишнего или недостающего нуля.'],
      ['Цена в кредит не принимается', 'Она должна быть меньше полной цены.'],
      ['Куда ведёт QR-код', 'На страницу модели на umo.auto. Другой адрес можно вписать в «Ссылка QR-кода».'],
    ],
  },
  '/plate-frame': {
    what: 'Строка под номером на рамке: «UMO» и название салона.',
    steps: [
      'Выберите дилера из списка или впишите название, как на вывеске.',
      'Выберите расположение: слева или по центру.',
      'Нажмите «Скачать PDF».',
    ],
    print: [
      'Отправьте файл UMO_plate-frame_501x21.pdf тому, кто делает вам рамки, и скажите: «УФ-печать белым на рамке, макет 1:1».',
      'Чёрный фон в файле только для наглядности и не печатается.',
    ],
    faq: [
      ['Текст стал красным', 'Строка длиннее поля рамки, 501 мм. Сократите название.'],
    ],
  },
  '/hours-sign': {
    what: 'Табличка с режимом работы 480 × 680 мм: часы, название, адрес, телефон и сайт салона.',
    steps: [
      'Выберите дилера из списка или впишите своё название: если салон есть в списке, адрес, часы и телефон с umo.auto подставятся сами.',
      'Проверьте часы: − и + меняют время на полчаса, его можно и вписать.',
      'Проверьте адрес, телефон и сайт.',
      'Нажмите «Скачать PDF».',
    ],
    print: [
      'Табличку не печатают на принтере. Отправьте файл UMO_hours-sign.pdf в рекламное производство и скажите: «Табличка 480 × 680 мм по макету, масштаб 1:1».',
    ],
    faq: [
      ['Разные часы по дням', 'На табличке одно время на все дни. Если часы разные, редактор их не подставит — впишите те, что подходят.'],
      ['«День короче 8 часов»', 'Это только предупреждение: проверьте время, файл скачать можно.'],
      SITE,
    ],
  },
  '/price-tag': {
    what: 'Ценники 90 × 60 мм на аксессуары, по восемь на листе A4.',
    steps: [
      'Выберите дилера из списка или впишите своё название: оно одно на все ценники.',
      'Впишите название товара, артикул (если есть) и цену. Копейки — после запятой.',
      'Подпись — «за штуку», «за комплект», «за упаковку» из списка или своя.',
      'Для других товаров нажмите «Добавить» или загрузите таблицу. Нажмите «Скачать PDF».',
    ],
    table: [
      '«Из таблицы» → «Скачать шаблон таблицы»: колонки Наименование, Артикул, Цена, Подпись.',
      'Заполните шаблон в Excel, нажмите «Загрузить таблицу или PDF» или перетащите файл на страницу.',
      'Можно и без шаблона: скопируйте строки в Excel и вставьте в любое поле.',
    ],
    print: [
      'На обычном офисном принтере: Ctrl + P, затем «Печать».',
      'Вырежьте ценники по серым линиям.',
    ],
    faq: [
      ['Длинное название', 'Помещается до четырёх строк. Если не влезает — сократите.'],
      ['Предел цены', 'До 9 999 999,99 ₽.'],
    ],
  },
}

const H = 'text-[16px] font-medium leading-5 tracking-[-0.01em]'

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {items.map((s, i) => <li key={i} className="flex gap-2"><span className="w-4 shrink-0 tabular-nums text-[#808080]">{i + 1}</span><span>{s}</span></li>)}
    </ol>
  )
}

function Part({ title, children }: { title: string; children: ReactNode }) {
  return <section className="flex flex-col gap-3"><h3 className={H}>{title}</h3>{children}</section>
}

function Generator({ help }: { help: Help }) {
  return (
    <>
      <p>{help.what}</p>
      <Part title="Шаги"><Steps items={help.steps} /></Part>
      {help.table && <Part title="Из таблицы"><Steps items={help.table} /></Part>}
      <Part title="Печать">{help.print.map((p, i) => <p key={i}>{p}</p>)}</Part>
      {help.faq.length > 0 && <Part title="Вопросы"><Faq items={help.faq} /></Part>}
    </>
  )
}

function Faq({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="flex flex-col gap-4">
      {items.map(([q, a]) => <div key={q}><dt className="font-medium">{q}</dt><dd>{a}</dd></div>)}
    </dl>
  )
}

/** What each instruction makes, after «Как сделать» in the title */
const MAKES: Record<string, string> = {
  '/name-tag': 'бейдж',
  '/business-card': 'визитку',
  '/livery': 'ливрею',
  '/price-card': 'прайс-карту',
  '/plate-frame': 'рамку номера',
  '/hours-sign': 'режимник',
  '/price-tag': 'ценники',
}

/**
 * «Инструкция» in the site's dialog (`Dialog`, as the guide's «Редактор материалов»), 560 px wide, opened on the page's
 * own and titled with what's being made: «Как сделать рамку номера» and a combobox's chevron, «Общие вопросы» for what
 * they share. The made thing and the chevron open the list of instructions in the dialog's body, in place of the text,
 * as «Редактор материалов» in the form's header opens the generators: 24 px Medium, 16 apart, the open one black, the
 * rest #bfbfbf; a pick shows that instruction from its top; the title again or Esc fold the list back (tried: a ring of
 * tabs under the title, a combobox's list over the text, «Все инструкции» at the foot)
 */
function HelpPanel({ page, tabs, onClose }: { page: string; tabs: { path: string; title: string }[]; onClose: () => void }) {
  const [tab, setTab] = useState(page)
  const [menu, setMenu] = useState(false)
  const body = useRef<HTMLDivElement>(null)
  useTypograf(body)
  useEffect(() => {
    if (!menu) return
    // On the document, so the dialog's Esc on the window doesn't hear it
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setMenu(false) } }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [menu])
  const pick = (t: string) => {
    setTab(t)
    setMenu(false)
    const dim = body.current?.closest<HTMLElement>('[data-dim]')
    if (dim) dim.scrollTop = 0
  }
  const items = [...tabs, { path: 'general', title: 'Общие вопросы' }]
  const help = HELP[tab]
  const toggle = (
    <button type="button" aria-expanded={menu} onClick={() => setMenu(!menu)} className="inline-flex cursor-pointer items-center gap-2 text-left">
      {MAKES[tab] ?? 'Общие вопросы'}
      <ChevronIcon open={menu} />
    </button>
  )
  const name = 'text-[24px] font-medium leading-6 tracking-[-0.01em] text-left'
  return (
    <Dialog title={MAKES[tab] ? <>Как сделать {toggle}</> : toggle} onClose={onClose} width={560}>
      <div ref={body} className="flex flex-col gap-8 text-[14px] leading-5 font-normal tracking-normal">
        {menu ? (
          <nav aria-label="Инструкции" className="flex flex-col items-start gap-4">
            {items.map(i => i.path === tab
              ? <button key={i.path} type="button" aria-current="true" onClick={() => setMenu(false)} className={`${name} cursor-pointer`}>{i.title}</button>
              : <button key={i.path} type="button" onClick={() => pick(i.path)} className={`${name} cursor-pointer text-[#bfbfbf] hover:text-[#808080] active:text-[#808080]`}>{i.title}</button>)}
          </nav>
        ) : help ? <Generator help={help} /> : GENERAL.map(([q, a]) => <Part key={q} title={q}><p>{a}</p></Part>)}
      </div>
    </Dialog>
  )
}

/** The «?» at the end of the breadcrumbs, in their type */
export default function HelpButton({ page, tabs }: { page: string; tabs: { path: string; title: string }[] }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const toggle = () => { if (!open) goal('open_help', { page }); setOpen(!open) }
  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label="Инструкция"
        title="Инструкция"
        className={`relative ml-auto shrink-0 cursor-pointer text-[14px] font-medium leading-4 after:absolute after:-inset-[10px] after:content-[''] ${open ? 'text-black' : 'text-[#808080] hover:text-black'}`}
      >
        ?
      </button>
      {open && <HelpPanel page={page} tabs={tabs} onClose={close} />}
    </>
  )
}
