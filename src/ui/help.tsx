import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTypograf } from '@/guide/typograf'
import { goal } from './metrika'

/**
 * «Помощь», the «?» at the end of the breadcrumbs (as Composter's): what to do in this generator, the table, the print
 * and the usual questions, for a dealer on their own. Help lives here, apart from the controls: no hint texts by them
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

const DEALER_MISSING: [string, ReactNode] = ['Моего салона нет в списке', 'Впишите название сами, как на вывеске. Список берётся с umo.auto, новые салоны появляются в нём позже.']
const SHARE: [string, ReactNode] = ['Как отправить коллеге', '«Поделиться» отправляет ссылку: по ней сразу скачивается готовый файл.']
const DROP_BACK = (file: string): [string, ReactNode] => ['Как поправить готовый файл', `Перетащите ${file} из «Загрузок» на страницу редактора — всё, что в нём было, откроется снова.`]
const SITE: [string, ReactNode] = ['Сайт вида agat-vladimir.umo.auto', 'Его редактор предлагает по названию салона, но такие адреса пока не открываются. Впишите сайт салона или umo.auto.']

const HELP: Record<string, Help> = {
  '/name-tag': {
    what: 'Бейдж сотрудника 70 × 25 мм: имя, фамилия и должность.',
    steps: [
      'Впишите имя, фамилию и должность. Должность можно выбрать из списка или написать свою.',
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
      DROP_BACK('архив'),
    ],
  },
  '/business-card': {
    what: 'Визитка сотрудника 90 × 50 мм, двусторонняя: на лицевой логотип, на обороте салон и сотрудник.',
    steps: [
      'Выберите дилера: адрес, сайт и телефон салона подставятся сами.',
      'Впишите имя, фамилию, должность, телефон и почту. Добавочный — во второй части поля телефона.',
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
      DEALER_MISSING,
      DROP_BACK('PDF'),
    ],
  },
  '/livery': {
    what: 'Наклейки на демо-автомобиль: оба борта и, если нужно, заднее стекло — UMO, модель, салон, слоган и QR-код.',
    steps: [
      'Выберите модель.',
      'Дилер: название салона на бортах, из списка или своё.',
      'Слоган: предложенный или свой.',
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
      DEALER_MISSING,
      SHARE,
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
      SHARE,
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
      DEALER_MISSING,
      SHARE,
    ],
  },
  '/hours-sign': {
    what: 'Табличка с режимом работы 480 × 680 мм: часы, название, адрес, телефон и сайт салона.',
    steps: [
      'Выберите дилера: адрес, часы и телефон с umo.auto подставятся сами.',
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
      DEALER_MISSING,
      DROP_BACK('PDF'),
    ],
  },
  '/price-tag': {
    what: 'Ценники 90 × 60 мм на аксессуары, по восемь на листе A4.',
    steps: [
      'Выберите дилера: он один на все ценники.',
      'Впишите название товара, артикул (если есть) и цену. Копейки — после запятой.',
      'Подпись — «за штуку», «за комплект» или «за упаковку».',
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
      DEALER_MISSING,
      DROP_BACK('PDF'),
    ],
  },
}

function Cross() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="square" /></svg>
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

/**
 * The «?» and its panel. Not modal, as Composter's: the form stays as it is under it. On wide screens a 480 px panel
 * over the canvas, 16 px off the sidebar and the screen's edges, shadowed as the phone's sheet; on phones a screen of
 * its own, as a combobox's search, through a portal, as the phone's sheet would hold it under the download. Closed by ×, Esc, the «?» again or a click outside it
 */
export default function HelpButton({ page, title }: { page: string; title: string }) {
  const [open, setOpen] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  useTypograf(panel)
  const help = HELP[page]
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const away = (e: PointerEvent) => {
      const t = e.target as Node
      if (!panel.current?.contains(t) && !button.current?.contains(t)) setOpen(false)
    }
    document.addEventListener('keydown', key)
    document.addEventListener('pointerdown', away)
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', away) }
  }, [open])
  if (!help) return null
  const toggle = () => { if (!open) goal('open_help', { page }); setOpen(!open) }
  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label="Помощь"
        title="Помощь"
        className={`relative ml-auto shrink-0 cursor-pointer text-[14px] font-medium leading-4 after:absolute after:-inset-[10px] after:content-[''] ${open ? 'text-black' : 'text-[#808080] hover:text-black'}`}
      >
        ?
      </button>
      {open && createPortal(
        <div
          ref={panel}
          role="dialog"
          aria-labelledby="help-title"
          className="fixed inset-0 z-50 overflow-y-auto bg-white px-6 pt-6 pb-[calc(24px+env(safe-area-inset-bottom))] text-[14px] leading-5 font-normal tracking-normal text-black md:inset-auto md:top-4 md:bottom-auto md:left-[337px] md:max-h-[calc(100dvh-32px)] md:w-[min(480px,calc(100vw-353px))] md:rounded-2xl md:pb-6 md:shadow-[0_10px_30px_rgba(0,0,0,0.1)]"
        >
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <h2 id="help-title" className="text-[24px] font-medium leading-6 tracking-[-0.01em]">{title}</h2>
                <button type="button" aria-label="Закрыть" onClick={() => setOpen(false)} className="relative flex h-6 shrink-0 cursor-pointer items-center text-black/50 hover:text-black after:absolute after:-inset-[10px] after:content-['']">
                  <Cross />
                </button>
              </div>
              <p>{help.what}</p>
            </div>
            <Part title="Как сделать"><Steps items={help.steps} /></Part>
            {help.table && <Part title="Из таблицы"><Steps items={help.table} /></Part>}
            <Part title="Печать">{help.print.map((p, i) => <p key={i}>{p}</p>)}</Part>
            <Part title="Вопросы">
              <dl className="flex flex-col gap-4">
                {help.faq.map(([q, a]) => <div key={q}><dt className="font-medium">{q}</dt><dd className="text-black/60">{a}</dd></div>)}
              </dl>
            </Part>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
