import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTypograf } from '@/guide/typograf'
import { goal } from './metrika'
import Dialog from './Dialog'
import { ChevronIcon, LinkIcon } from './icons'
import { SUPPORT_BOT, TEXT_LINK } from './links'
import { linkParams } from './share'
import { MOD } from './keys'
import { SITE } from '@/site'
import { MODELS, fileName } from '@/data/models'
import { PRICE_CARD } from '@brand/price-card'
import { FONTS } from '@brand/fonts'

/** The site's domain, the brand's own site, its name and files' prefix, as the instructions write them */
const DOMAIN = SITE.domain
const HOME = new URL(SITE.home).host
const NAME = SITE.name
const FILE = SITE.file
/** The livery's archives, the last model's first: «<Brand>8_dealer-livery.zip (или <Brand>5_…)» */
const LIVERY_ZIPS = [...MODELS].reverse().map((m, i) => (i ? `${fileName(m.id, '')}_…` : `${fileName(m.id, '')}_dealer-livery.zip`)).join(' (или ') + (MODELS.length > 1 ? ')' : '')
/** The price card's trims per model: «Про и Макс для <Бренд> 5, Макс и Ультра для <Бренд> 8» */
const TRIM_LIST = MODELS.map(m => `${PRICE_CARD.trims[m.id].map(t => t.name).join(' и ')} для ${m.name}`).join(', ')
/** How many cards every trim makes, in words: «четыре карты» */
const CARDS_COUNT = (n => `${['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять', 'десять'][n] ?? n} ${n === 1 ? 'карта' : n < 5 ? 'карты' : 'карт'}`)(MODELS.reduce((n, m) => n + PRICE_CARD.trims[m.id].length, 0))

/** Illustrator's «Показать все монтажные области», as the dealer's keyboard has it */
const FIT_ALL = MOD === '⌘' ? '⌥⌘0' : 'Alt+Ctrl+0'

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

/** The site the generator makes up from the dealer's name (`siteFor`), to be checked: such subdomains didn't resolve as of 2026-10-16 */
const SITE_CHECK = (more = ''): [string, ReactNode] => ['Проверьте сайт', `Редактор подставляет сайт по названию салона, например agat-vladimir.${HOME}. Откройте его в браузере: если он не открывается или у салона свой сайт, впишите свой или ${HOME}.${more}`]

/**
 * A link to send, with its copy after it: the link icon, #808080, black on hover; copied, «Скопировано» in its place
 * for two seconds, as «Поделиться» says it
 */
function CopyLink({ href, children }: { href: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => { if (!copied) return; const t = setTimeout(() => setCopied(false), 2000); return () => clearTimeout(t) }, [copied])
  return (
    <>
      <a href={href} target="_blank" rel="noopener" className={TEXT_LINK}>{children}</a>
      {copied
        ? <span className="ml-1 text-caption">Скопировано</span>
        : (
          <button type="button" title="Скопировать ссылку" aria-label="Скопировать ссылку" onClick={() => navigator.clipboard.writeText(href).then(() => setCopied(true))} className="ml-1 inline-flex cursor-pointer align-[-3px] text-caption hover:text-black">
            <LinkIcon />
          </button>
        )}
    </>
  )
}

/** The brand's support bot, linked as the guide's «Контакты» link it */
const Bot = ({ children }: { children: ReactNode }) => <a href={SUPPORT_BOT} target="_blank" rel="noopener" className={TEXT_LINK}>{children}</a>

/**
 * The editable template in «Печать»: what «Скачать шаблон» gives and the blank one's link (`src/ui/template.tsx`);
 * the memo says it its own way
 */
const TEMPLATE = (path: string): ReactNode[] => [
  'Если типографии или производству нужно поправить текст, нажмите значок «Скачать шаблон» (стрелка вниз) у нужного макета: в PDF будет этот макет с живым текстом, пустые поля — заглушками.',
  <>Пустой шаблон всегда по ссылке <CopyLink href={`https://${DOMAIN}${path}?t`}>{`${DOMAIN}${path}?t`}</CopyLink>.</>,
]

/** What every generator shares, the «Общее» tab */
const GENERAL: [string, ReactNode][] = [
  ['Поле со стрелкой — только выбор из списка?', 'Нет. В поле со стрелкой можно печатать, как в обычном: список под ним только подсказывает. Нажмите в поле и впишите своё — название салона, должность, слоган, подпись ценника.'],
  ['Что можно поменять', 'Любое поле. То, что подставилось само — адрес, телефон, часы, сайт, цена, слоган, — правится так же, как остальное.'],
  ['Что не меняется', `Только части самого макета: логотип, фото, описание машины, цена «от» и ежемесячный платёж на прайс-карте, «${NAME}» на рамке, «Работаем без выходных» на режимнике, «Официальный дилер ${NAME}» на визитке.`],
  ['Чёрная кнопка внизу не скачивает', 'Пока чего-то не хватает, она называет следующий шаг: «Выбрать дилера», «Указать цену». Нажмите — редактор покажет это поле. Если макетов несколько, цифры рядом, например 3/8, — в каком из них.'],
  ['Шрифт в шаблоне заменился', <>{`Шаблон правится только на компьютере, где установлен ${FONTS.family} (Regular и Medium), иначе программа подставит другой шрифт. Если шрифта нет, `}<Bot>напишите боту поддержки</Bot>.</>],
  ['Шаблон открылся, а холст пустой', `Листы на месте, просто не в кадре: Вид → Показать все монтажные области (${FIT_ALL}).`],
  ['Моего салона нет в списке', <>{`Впишите название сами, как на вывеске. Список берётся с ${HOME}, новые салоны появляются в нём позже. Чтобы салон добавили, `}<Bot>напишите боту поддержки</Bot>.</>],
  ['Как отправить коллеге', '«Поделиться» отправляет ссылку: по ней сразу скачивается готовый файл.'],
  ['Как поправить готовый файл', 'Бейдж, визитку, ценник и режимник: перетащите скачанный файл из «Загрузок» на страницу редактора — всё, что в нём было, откроется снова. Прайс-карту, ливрею и рамку откройте по ссылке из «Поделиться».'],
  ['Можно ли с телефона', 'Да, всё работает в браузере телефона. Но таблицы и отправку файлов в типографию удобнее делать с компьютера.'],
  ['Изготовитель просит другой файл', <>Если типография или производство просит другой формат, вылеты под обрез или файл для своей программы, <Bot>напишите боту поддержки</Bot> и перешлите их требования.</>],
  ['Нужен другой материал', <>Вывеску, баннер, ролл-ап и другое, чего нет в редакторе, <Bot>согласуйте через бота поддержки</Bot>: приложите макет и расскажите, где он будет размещён.</>],
  ['Не нашли ответа', <><Bot>Напишите боту поддержки</Bot>: пришлите снимок экрана с редактором и расскажите, что не получается.</>],
]

const HELP: Record<string, Help> = {
  '/name-tag': {
    what: 'Бейдж сотрудника 70 × 25 мм: имя, фамилия и должность.',
    steps: [
      'Впишите имя, фамилию и должность. Должность можно выбрать из списка под полем или напечатать свою.',
      'Для нескольких сотрудников нажмите «+» справа от макета или загрузите таблицу.',
      'Нажмите «Скачать ZIP».',
    ],
    table: [
      '«Из таблицы» → «Скачать шаблон таблицы»: колонки Имя, Фамилия, Должность.',
      'Заполните шаблон в Excel, нажмите «Загрузить таблицу или ZIP» или перетащите файл на страницу.',
      'Можно и без шаблона: скопируйте строки в Excel и вставьте в любое поле.',
    ],
    print: [
      `Бейджи не печатают на принтере. Отправьте архив ${FILE}_name-tags.zip изготовителю бейджей: в нём макет, образец и требования.`,
      'Скажите: «Бейдж 70 × 25 мм по макету и требованиям из архива».',
      ...TEMPLATE('/name-tag'),
    ],
    faq: [
      ['Имя не помещается', <>Шрифт на бейдже не уменьшается. Двойную фамилию перенесите на вторую строку клавишей Enter. Если и так не влезает, <Bot>напишите боту поддержки</Bot>.</>],
      ['Нужно ли отчество', 'Нет. Если вставить ФИО целиком, отчество уберётся само.'],
      ['Поле стало красным', 'В имени только буквы, дефис и точка. Цифры и другие знаки — чаще всего таблица вставилась со сдвигом.'],
    ],
  },
  '/business-card': {
    what: 'Визитка сотрудника 90 × 50 мм, двусторонняя: на лицевой логотип, на обороте салон и сотрудник.',
    steps: [
      'Выберите дилера из списка или впишите своё название: если салон есть в списке, его адрес, сайт и телефон подставятся сами. Адрес и сайт проверьте в «Редактировать» рядом с «Дилер».',
      'Впишите имя, фамилию, должность (из списка или свою), телефон и почту. Добавочный — во второй части поля телефона.',
      'Для нескольких сотрудников нажмите «+» справа от макета или загрузите таблицу. Салон у всех один.',
      'Нажмите «Скачать PDF».',
    ],
    table: [
      '«Из таблицы» → «Скачать шаблон таблицы»: колонки Имя, Фамилия, Должность, Почта, Телефон, Добавочный.',
      'Заполните шаблон в Excel, нажмите «Загрузить таблицу или PDF» или перетащите файл на страницу.',
      'Можно и без шаблона: скопируйте строки в Excel и вставьте в любое поле.',
    ],
    print: [
      `Визитки печатает типография. Отправьте ей файл ${FILE}_business-cards.pdf и скажите: «Визитки 90 × 50 мм, двусторонние, макет 1:1».`,
      'Если типография просит метки реза — поставьте галочку «Метки реза». Если просит лицевую сторону перед каждым оборотом — «Обложка у всех».',
      ...TEMPLATE('/business-card'),
    ],
    faq: [
      ['Где адрес, сайт и QR-код', '«Редактировать» рядом с «Дилер». QR-код ведёт на сайт; другую ссылку для него можно вписать там же.'],
      SITE_CHECK(' На визитке он стоит и в QR-коде.'),
      ['Почта стала красной', 'В адресе смешаны русские и латинские буквы, например русская «о». Перепечатайте его латиницей.'],
    ],
  },
  '/livery': {
    what: `Наклейки на демо-автомобиль: оба борта и, если нужно, заднее стекло — ${NAME}, модель, салон, слоган и QR-код.`,
    steps: [
      'Выберите модель.',
      'Дилер: название салона на бортах. Выберите из списка или напечатайте своё.',
      'Слоган: выберите из списка или напечатайте свой.',
      `QR-код: сайт салона. Без своего сайта он ведёт на страницу модели на ${HOME}.`,
      'Если нужно, включите «Заднее стекло». Нажмите «Скачать ZIP».',
    ],
    print: [
      `Отправьте архив ${LIVERY_ZIPS} в рекламное производство, которое оклеит машину: в нём наклейки 1:1, схема расположения и шаблон.`,
      'Скажите: «Плоттерная резка по макету 1:1, цвет плёнки и расположение — по схеме из архива».',
      '«Показать размеры» покажет на машине те же размеры, что в схеме.',
      'Шаблон — все листы с живым текстом по умолчанию, чтобы производство поправило текст само. Он же скачивается значком «Скачать шаблон» (стрелка вниз) у любого листа.',
      <>И всегда по ссылке <CopyLink href={`https://${DOMAIN}/livery?t`}>{`${DOMAIN}/livery?t`}</CopyLink>.</>,
    ],
    faq: [
      ['Текст стал красным', <>Он не помещается или заходит на ручку или шов двери. Сократите его или перенесите строку клавишей Enter. Если название салона сокращать нельзя, <Bot>напишите боту поддержки</Bot>.</>],
      ['Без QR-кода', 'Буквы станут на треть крупнее. Маленький QR-код («Мельче») читается только вблизи, с полутора метров.'],
    ],
  },
  '/price-card': {
    what: 'Прайс-карта A3 или A4 для машины в салоне: модель, комплектация, полная стоимость и QR-код на страницу модели.',
    steps: [
      'Выберите модель и комплектацию: цена «от», полная стоимость и сноска подставятся сами.',
      'Если на машине есть дополнительное оборудование, впишите полную стоимость вместе с ним: по закону на ценнике должна быть цена целиком. Ниже цены комплектации её поставить нельзя.',
      `Цена «от» в шапке и ежемесячный платёж не меняются: это цена комплектации без допов и условия кредита ${NAME}.`,
      'Для другой машины или комплектации нажмите «+» справа от макета.',
      'Нажмите «Скачать PDF»: каждая карта — отдельная страница.',
    ],
    print: [
      'Ctrl + P, в «Размер бумаги» выберите A3 или A4, затем «Печать». Макет сделан под A3, на A4 он просто уменьшится.',
      'Если цветного принтера нет — передайте файл в копицентр и попросите: «Цветная печать, A3» или «A4».',
      'Значок со стрелкой вниз у макета скачивает только эту карту.',
      <>{`Все ${CARDS_COUNT} с ценами по умолчанию — по ссылке `}<CopyLink href={`https://${DOMAIN}/price-card?t`}>{`${DOMAIN}/price-card?t`}</CopyLink>.</>,
    ],
    faq: [
      ['Почему на карте две цены', '«от» в шапке — цена комплектации без допов. «Полная стоимость» внизу — цена этой машины со всем, что на ней установлено.'],
      ['«Стоимость ниже цены»', 'Полная стоимость не может быть меньше цены комплектации — цены «от» в шапке. Проверьте, нет ли лишнего или недостающего нуля.'],
      ['«Сноска слишком длинная»', 'Чем длиннее сноска, тем выше она поднимает цены, и они упёрлись в список комплектации. Сократите текст сноски.'],
      ['Куда ведёт QR-код', `На страницу модели на ${HOME}. Другой адрес можно вписать в «Ссылка QR-кода».`],
      ['Нет моей комплектации', <>{`В редакторе комплектации ${TRIM_LIST}. Если нужна другая, `}<Bot>напишите боту поддержки</Bot>.</>],
    ],
  },
  '/plate-frame': {
    what: `Строка под номером на рамке: «${NAME}» и название салона.`,
    steps: [
      'Выберите дилера из списка или впишите название, как на вывеске.',
      'Выберите расположение: слева или по центру.',
      'Нажмите «Скачать PDF».',
    ],
    print: [
      `Отправьте файл ${FILE}_plate-frame_501x21.pdf тому, кто делает вам рамки, и скажите: «УФ-печать белым на рамке, макет 1:1».`,
      'Чёрный фон в файле только для наглядности и не печатается.',
      ...TEMPLATE('/plate-frame'),
    ],
    faq: [
      ['Текст стал красным', <>Строка длиннее поля рамки, 501 мм. Сократите название. Если сокращать нельзя, <Bot>напишите боту поддержки</Bot>.</>],
    ],
  },
  '/memo': {
    what: `Памятка владельца, два листа A4: правила обслуживания, приложение ${NAME} и контакты салона и консультанта.`,
    steps: [
      'Выберите дилера из списка: адрес и телефон подставятся сами. Проверьте их и впишите почту и сайт салона.',
      'Укажите должность, имя, фамилию и телефон консультанта. ФИО можно вписать целиком в «Имя»: фамилия сама перейдёт в своё поле, отчество не нужно.',
      'Для другого консультанта нажмите «+» справа от макета.',
      'Нажмите «Скачать PDF»: на каждого консультанта по два листа.',
    ],
    print: [
      'Ctrl + P, A4, двусторонняя печать.',
      `Если нужно поменять текст памятки, нажмите значок «Скачать шаблон» (стрелка вниз) у нужного консультанта: в этом PDF весь текст живой. Откройте его в Illustrator или Acrobat, где установлен шрифт ${FONTS.family}.`,
      <>Пустой шаблон для дизайнера всегда по ссылке <CopyLink href={`https://${DOMAIN}/memo?t`}>{`${DOMAIN}/memo?t`}</CopyLink>, её можно отправить вместо файла.</>,
    ],
    faq: [
      ['Нужно отчество', 'Допишите его в поле «Имя» после имени: «Иван Сергеевич». На памятке будет «Иван Сергеевич Петров».'],
      ['Шрифт в шаблоне заменился', <>{`Шаблон правится только на компьютере, где установлен ${FONTS.family} (Regular и Medium), иначе программа подставит другой шрифт. Если шрифта нет, `}<Bot>напишите боту поддержки</Bot>.</>],
      ['Шаблон открылся, а холст пустой', `Листы на месте, просто не в кадре: Вид → Показать все монтажные области (${FIT_ALL}).`],
      SITE_CHECK(),
    ],
  },
  '/hours-sign': {
    what: 'Табличка с режимом работы 480 × 680 мм: часы, название, адрес, телефон и сайт салона.',
    steps: [
      `Выберите дилера из списка или впишите своё название: если салон есть в списке, адрес, часы и телефон с ${HOME} подставятся сами.`,
      'Проверьте часы: − и + меняют время на полчаса, его можно и вписать.',
      'Проверьте адрес, телефон и сайт.',
      'Нажмите «Скачать PDF».',
    ],
    print: [
      `Табличку не печатают на принтере. Отправьте файл ${FILE}_hours-sign.pdf в рекламное производство и скажите: «Табличка 480 × 680 мм по макету, масштаб 1:1».`,
      ...TEMPLATE('/hours-sign'),
    ],
    faq: [
      ['Разные часы по дням', <>На табличке одно время на все дни. Если часы разные, редактор их не подставит — впишите те, что подходят. Если нужна табличка с часами по дням, <Bot>напишите боту поддержки</Bot>.</>],
      ['«День короче 8 часов»', 'Это только предупреждение: проверьте время, файл скачать можно.'],
      SITE_CHECK(),
    ],
  },
  '/price-tag': {
    what: 'Ценники 90 × 60 мм на аксессуары, по восемь на листе A4.',
    steps: [
      'Выберите дилера из списка или впишите своё название: оно одно на все ценники.',
      'Впишите название товара, артикул (если есть) и цену. Копейки — после запятой.',
      'Подпись — «за штуку», «за комплект», «за упаковку» из списка или своя.',
      'Для других товаров нажмите «+» справа от макета или загрузите таблицу. Нажмите «Скачать PDF».',
    ],
    table: [
      '«Из таблицы» → «Скачать шаблон таблицы»: колонки Наименование, Артикул, Цена, Подпись.',
      'Заполните шаблон в Excel, нажмите «Загрузить таблицу или PDF» или перетащите файл на страницу.',
      'Можно и без шаблона: скопируйте строки в Excel и вставьте в любое поле.',
    ],
    print: [
      'На обычном офисном принтере: Ctrl + P, затем «Печать».',
      'Вырежьте ценники по серым линиям.',
      ...TEMPLATE('/price-tag'),
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
      {items.map((s, i) => <li key={i} className="flex gap-2"><span className="w-4 shrink-0 tabular-nums text-caption">{i + 1}</span><span>{s}</span></li>)}
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
  '/memo': 'памятку владельца',
  '/price-tag': 'ценники',
}

/**
 * «Инструкция» in the site's dialog (`Dialog`, as the guide's «Редактор материалов»), 560 px wide, opened on the page's
 * own and titled with what's being made: «Как сделать рамку номера» and a combobox's chevron, «Общие вопросы» for what
 * they share. The made thing and the chevron open the list of instructions in the dialog's body, in place of the text,
 * as «Редактор материалов» in the form's header opens the generators: 24 px Medium, 16 apart, the open one black, the
 * rest #bfbfbf; a pick shows that instruction from its top; the title again or Esc fold the list back (not a ring of
 * tabs under the title, a combobox's list over the text or «Все инструкции» at the foot)
 */
function HelpPanel({ page, tabs, onClose, initial = page }: { page: string; tabs: { path: string; title: string }[]; onClose: () => void; initial?: string }) {
  const [tab, setTab] = useState(initial)
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
              : <button key={i.path} type="button" onClick={() => pick(i.path)} className={`${name} cursor-pointer text-[#bfbfbf] hover:text-caption active:text-caption`}>{i.title}</button>)}
          </nav>
        ) : <>
          {help ? <Generator help={help} /> : GENERAL.map(([q, a]) => <Part key={q} title={q}><p>{a}</p></Part>)}
          {/* The instruction's own link, to send: the generator with it open (`?help`; «Общие вопросы» from this page) */}
          <p>Ссылка на инструкцию: <CopyLink href={help ? `https://${DOMAIN}${tab}?help` : `https://${DOMAIN}${page}?help=general`}>{help ? `${DOMAIN}${tab}?help` : `${DOMAIN}${page}?help=general`}</CopyLink></p>
        </>}
      </div>
    </Dialog>
  )
}

/** The «?» at the end of the breadcrumbs, in their type */
export default function HelpButton({ page, tabs }: { page: string; tabs: { path: string; title: string }[] }) {
  // `help` in the link opens it at once, on this page's instruction (`help=general`: «Общие вопросы»)
  const [initial] = useState(() => (linkParams().get('help') === 'general' ? 'general' : page))
  const [open, setOpen] = useState(() => {
    const has = linkParams().has('help')
    if (has) goal('open_help', { page, via: 'link' })
    return has
  })
  const close = useCallback(() => {
    setOpen(false)
    // Closed, it isn't opened again by a reload
    const url = new URL(window.location.href)
    if (url.searchParams.has('help')) { url.searchParams.delete('help'); window.history.replaceState(window.history.state, '', url) }
  }, [])
  const toggle = () => { if (!open) goal('open_help', { page }); setOpen(!open) }
  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label="Инструкция"
        title="Инструкция"
        className={`relative ml-auto shrink-0 cursor-pointer text-[14px] font-medium leading-4 after:absolute after:-inset-[10px] after:content-[''] ${open ? 'text-black' : 'text-caption hover:text-black'}`}
      >
        ?
      </button>
      {open && <HelpPanel page={page} tabs={tabs} onClose={close} initial={initial} />}
    </>
  )
}
