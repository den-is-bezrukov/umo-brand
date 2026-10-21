import type { ReactNode } from 'react'
import type { GuideChapter } from '@/brand'
import { Assets, Bubble, Caption, Chapter, Dictionary, Fig, H2, Head, LogoPlate, Photo, PhotoCard, PreviewLink, Previews, PriceCardPreview, Section, Swatch, Text, Zoom, img, type Medium, type Rule } from '@/guide/parts'
import { TEXT_LINK, SUPPORT_BOT } from '@/ui/links'
import UmoYandexLockup from '@brand/CobrandLockup'
import { COLORS } from '@brand/colors'
import PlateArt from '@/plate/PlateArt'
import { BASELINE as STRIP_BASELINE } from '@/plate/frame'
import { toD } from '@/livery/geometry'
import { TAG, BAND, BAND_ART, DEFAULT_CAPTION, SIDE as TAG_SIDE, CAP as TAG_CAP, DROP as TAG_DROP, DEALER as TAG_DEALER, NAME as TAG_NAME, SMALL as TAG_SMALL, TRACK as TAG_TRACK, CAPTION_TOP as TAG_CAPTION_TOP, PRICE as TAG_PRICE } from '@/pricetag/tag'
import { SIGN, LOGO as SIGN_LOGO, MARGIN as SIGN_MARGIN, TIME as SIGN_TIME, LINE as SIGN_LINE, INFO as SIGN_INFO, INFO_LAST as SIGN_INFO_LAST } from '@/hours/sign'
import heroMp4 from './images/hero.mp4'
import hero720Mp4 from './images/hero-720.mp4'

// UMO's guide: its chapters and what they say, the first screen's film and statement, the pictures of its materials,
// the contacts. The page around them, the contents, Материалы and the editor are the core's (`src/guide/Guide.tsx`),
// the blocks they're written with too (`src/guide/parts.tsx`).

/** The chapters in the contents, before Материалы and Контакты, which the core adds */
export const CHAPTERS: GuideChapter[] = [
  {
    id: 'brand',
    title: 'Платформа бренда',
    children: [
      { id: 'positioning', title: 'Позиционирование' },
      { id: 'vision', title: 'Видение' },
      { id: 'mission', title: 'Миссия' },
      { id: 'audience', title: 'Аудитория' },
    ],
  },
  {
    id: 'communication',
    title: 'Коммуникация',
    children: [
      { id: 'name', title: 'Имена' },
      { id: 'descriptors', title: 'Дескрипторы' },
      { id: 'tone', title: 'Тон голоса' },
      { id: 'dictionary', title: 'Словарь' },
      { id: 'examples', title: 'Примеры' },
    ],
  },
  {
    id: 'logo',
    title: 'Логотип',
    children: [
      { id: 'placement', title: 'Размещение на продукте' },
      { id: 'clearspace', title: 'Отступы и размер' },
      { id: 'logo-color', title: 'Цвет логотипа' },
      { id: 'misuse', title: 'Ограничения' },
      { id: 'icons', title: 'Логотип на иконках' },
      { id: 'cobranding', title: 'Кобрендинг' },
    ],
  },
  { id: 'typography', title: 'Типографика', children: [{ id: 'type-styles', title: 'Стили и иерархия' }] },
  {
    id: 'lettering',
    title: 'Леттеринг',
    children: [
      { id: 'lettering-models', title: 'Модели' },
      { id: 'made-in-moscow', title: 'Сделано в Москве' },
    ],
  },
  { id: 'color', title: 'Цвет' },
  {
    id: 'photography',
    title: 'Фотография',
    children: [
      { id: 'photo-umo5', title: 'UMO 5' },
      { id: 'photo-umo8', title: 'UMO 8' },
    ],
  },
  { id: 'spaces', title: 'Пространства' },
]

/** Chapter anchors that were renamed after the guide went out, mapped to their current ids. */
export const OLD_ANCHORS: Record<string, string> = {
  voice: 'tone', message: 'communication', dealer: 'spaces', retail: 'spaces', print: 'materials', fonts: 'typography', about: 'brand', intro: 'top',
}

/** The first screen: the film (1080p, 720p on a slow connection), its first frame, the still photo with reduced motion */
export const HERO = { video: heroMp4, small: hero720Mp4, poster: 'hero-poster', still: 'hero', stillAlt: 'Женщина у UMO 8 на горной дороге' }

/** The line under the film, the brand's descriptor */
export const STATEMENT = 'Автомобильный бренд, созданный в технологическом партнёрстве с Яндексом'

/** Материалы' first sentence, before the list of what the generators make */
export const MATERIALS_LEAD = 'Готовый дизайн, который встречает клиента у дилера UMO:'

/** Материалы' first sentence lists the generators in this order, the ones not in it after them */
export const INTRO_ORDER = ['/livery', '/business-card', '/name-tag', '/price-card', '/plate-frame', '/price-tag', '/hours-sign']

/** Материалы' pictures, drawn for the guide; a generator without one gets its own preview or a grey card */
export const DRAWN: Medium[] = [
  { id: 'livery', to: '/livery', title: 'Ливрея', row: 'Редактировать ливрею', w: 912, h: 456, picture: <Fig name="livery-umo5" flat="#f6f6f6" w={912} h={456} alt="UMO 5 с ливреей дилера" /> },
  {
    // The 210×297 card centred on the 444×333 grey
    id: 'price-card', to: '/price-card', title: 'Прайс-карта', row: 'Обновить прайс-карту', w: 444, h: 333,
    picture: (
      <div className="flex aspect-4/3 items-center justify-center bg-surface">
        <div className="w-[47.3%]">
          <PriceCardPreview model="umo5" trim="max" alt="Прайс-карта UMO 5" />
        </div>
      </div>
    ),
  },
  {
    // The 90×60 tag as the constructor sets it, as wide as the plate on the 444×333 grey
    id: 'price-tag', to: '/price-tag', title: 'Ценник', row: 'Сделать ценники', w: 444, h: 333,
    picture: (
      <div className="flex aspect-4/3 items-center justify-center bg-surface">
        <svg viewBox={`0 0 ${TAG.w} ${TAG.h}`} className="block h-auto w-[58.8%]" role="img" aria-label="Ценник UMO">
          <rect width={TAG.w} height={TAG.h} fill="white" />
          <rect width={TAG.w} height={BAND} fill="black" />
          <path d={toD(BAND_ART)} fill="white" fillRule="evenodd" />
          <g fontFamily="CoFo Sans" fontWeight={500}>
            <text x={TAG_DEALER.x} y={TAG_SIDE + TAG_CAP * TAG_DEALER.size} fontSize={TAG_DEALER.size} fill="white" style={{ fontFeatureSettings: "'case' 1" }}>Название дилера</text>
            {['Коврики в салон', 'UMO 5, комплект'].map((t, i) => <text key={t} x={TAG_SIDE} y={TAG_NAME.top + TAG_DROP * TAG_NAME.size + i * TAG_NAME.size} fontSize={TAG_NAME.size}>{t}</text>)}
            <text x={TAG_SIDE} y={TAG_CAPTION_TOP + TAG_DROP * TAG_SMALL} fontSize={TAG_SMALL} fontWeight={400} letterSpacing={TAG_TRACK}>{DEFAULT_CAPTION}</text>
            <text x={TAG_SIDE} y={TAG_PRICE.top + TAG_DROP * TAG_PRICE.size} fontSize={TAG_PRICE.size} style={{ fontVariantNumeric: 'lining-nums tabular-nums' }}>4 990 ₽</text>
          </g>
        </svg>
      </div>
    ),
  },
  { id: 'business-card', to: '/business-card', title: 'Визитка', row: 'Оформить визитки', w: 444, h: 333, picture: <Fig name="business-card-card" w={444} h={333} alt="Визитка дилера UMO, обе стороны" /> },
  { id: 'name-tag', to: '/name-tag', title: 'Бейдж', row: 'Подписать бейджи', w: 444, h: 333, picture: <Fig name="name-tag-card" w={444} h={333} alt="Бейдж UMO на рубашке сотрудника" /> },
  {
    // The 480×680 sign as tall as the price card on the 444×333 grey
    id: 'hours-sign', to: '/hours-sign', title: 'Режимник', row: 'Указать часы работы', w: 444, h: 333,
    picture: (
      <div className="flex aspect-4/3 items-center justify-center bg-surface">
        <svg viewBox={`0 0 ${SIGN.w} ${SIGN.h}`} className="block h-auto w-[47.3%]" role="img" aria-label="Режимник UMO">
          <rect width={SIGN.w} height={SIGN.h} fill="white" />
          <path d={toD(SIGN_LOGO)} fill="black" fillRule="evenodd" />
          <g fontFamily="CoFo Sans" fontWeight={500} style={{ fontFeatureSettings: "'case' 1" }}>
            <text x={SIGN.w / 2} y={SIGN_TIME.baseline} fontSize={SIGN_TIME.size} letterSpacing={SIGN_TIME.track * SIGN_TIME.size} textAnchor="middle" style={{ fontVariantNumeric: 'lining-nums tabular-nums' }}>9:00—21:00</text>
            <text x={SIGN.w / 2} y={SIGN_LINE.baseline} fontSize={SIGN_LINE.size} letterSpacing={SIGN_LINE.track * SIGN_LINE.size} textAnchor="middle">Работаем без выходных</text>
            {['UMO Название дилера', 'Адрес: Москва, ул. Примерная, 1', 'Телефон: +7 495 000 00 00', 'umo.auto'].map((t, i, rows) => (
              <text key={t} x={SIGN_MARGIN} y={SIGN_INFO_LAST - (rows.length - 1 - i) * SIGN_INFO.leading} fontSize={SIGN_INFO.size}>{t}</text>
            ))}
          </g>
        </svg>
      </div>
    ),
  },
  {
    // The 261×66 plate in its frame centred on the 444×333 grey
    id: 'plate-frame', to: '/plate-frame', title: 'Рамка номера', row: 'Сделать рамку номера', w: 444, h: 333,
    picture: (
      <div className="flex aspect-4/3 items-center justify-center bg-surface">
        <PlateArt className="w-[58.8%]!">
          <text y={STRIP_BASELINE} fontFamily="CoFo Sans" fontWeight={500} fontSize={18} letterSpacing={-0.18} fill="white" style={{ fontFeatureSettings: "'case' 1" }}>Центр UMO | Название дилера</text>
        </PlateArt>
      </div>
    ),
  },
]

/**
 * Model ad banner: photo background (WebP) with live CoFo Sans text and the vector UMO | Я lockup on top.
 * Sizes and offsets are Figma pixels in a `w`-wide frame, converted to container-width units so the
 * layout scales with the banner and stays sharp at any size.
 */
function Poster({ bg, w, h, title, subtitle, center, alt }: {
  bg: string; w: number; h: number; title: string; subtitle: ReactNode; center?: boolean; alt: string
}) {
  const u = (px: number) => `${(px / w) * 100}cqw`
  const x = center ? { left: '50%', transform: 'translateX(-50%)', textAlign: 'center' as const } : { left: u(24) }
  return (
    <figure
      role="img"
      aria-label={alt}
      className="relative overflow-hidden bg-black text-white [container-type:inline-size]"
      style={{ aspectRatio: `${w} / ${h}` }}
    >
      <img src={img(bg)} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
      <p className="absolute whitespace-nowrap font-medium leading-none tracking-[-0.01em]" style={{ ...x, top: u(24), fontSize: u(24) }}>
        {title}
      </p>
      <p className="absolute whitespace-nowrap font-medium leading-none tracking-[-0.01em]" style={{ ...x, top: u(56), fontSize: u(8) }}>
        {subtitle}
      </p>
      <div className="absolute" style={{ ...x, bottom: u(20), width: u(100) }}>
        <UmoYandexLockup className="w-full" />
      </div>
    </figure>
  )
}

// Vercel's own release: Google Fonts has no direct download link any more, only its specimen page.
const GEIST_ZIP = 'https://github.com/vercel/geist-font/releases/download/v1.7.2/geist-font-v1.7.2.zip'

const UMO5_SUBTITLE = <>Электромобиль с Алисой на борту<br />от 2,5 млн ₽</>
const UMO8_SUBTITLE = <>Гибридный кроссовер<br />с Алисой на борту от 5 млн ₽</>

const DICTIONARY: Rule[] = [
  { good: 'Технологичный', bad: 'Инновационный, революционный', why: 'Мы избегаем затертых маркетинговых штампов, лишенных конкретного смысла' },
  { good: 'Рациональный, честный', bad: 'Доступный, бюджетный', why: 'Слово «доступный» часто считывается как «дешевый», что искажает суть нашего технологического премиума' },
  { good: 'Электромобиль, электрокар, гибрид, кроссовер', bad: 'Тачка, машинка, электричка', why: 'Придерживаемся грамотной терминологии, не допускаем панибратства' },
  { good: 'Выразительный взгляд, удобная посадка', bad: 'Агрессивный дизайн, лаконичные линии, хищный оскал', why: 'Избегаем профессиональные штампы и устоявшиеся клише' },
  { good: 'Заголовки без точек в конце, точки в конце предложений', bad: 'Заголовки с точкой, нет знаков препинания, эмодзи в тексте', why: 'Пунктуация и оформление текстовых стилей по правилам русского языка' },
]

function Examples() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
      <div className="flex flex-col gap-4 md:gap-6">
        <PhotoCard name="voice-alice" title="Проще — говоря">Управляйте голосом с помощью Алисы</PhotoCard>
        <Bubble title="Умный">Оснащён технологиями Яндекса</Bubble>
        <Bubble title="Просторный">Найдётся место для всего на свете</Bubble>
        <Bubble title="Тихий">Не создает шума<br />на дорогах</Bubble>
      </div>
      <div className="flex flex-col gap-4 md:gap-6">
        {/* On phones, in one column, after the runner: so the three bubbles before it don't run into a fourth */}
        <div className="max-sm:order-1">
          <Bubble title={<>Электромобиль с <span className="font-['Alice_Okniks'] [font-feature-settings:'ss02']">@</span> Алисой и сервисами Яндекса. Запас хода до 420 км, разгон до 100 км/ч за 8,7 секунды</>} />
        </div>
        {/* As «Запоминающиеся фары»: the last word not tied to «город», so «сделать» doesn't stand alone in a narrow card */}
        <PhotoCard name="voice-runner" grow focus={20} title={<>Практичный и инновационный UMO поможет сделать город{' '}комфортнее</>} />
      </div>
      <div className="flex flex-col gap-4 md:gap-6">
        <PhotoCard name="voice-charging" grow title="Послушаем, как поют птицы в парке, пока заряжается UMO" />
        {/* Separate text nodes, so the typograph doesn't tie the last word to this long one: in three columns at
            640–767 px the pair is wider than its bubble */}
        <Bubble title={<>Запоминающиеся{' '}фары</>}>Светодиодная оптика даёт яркий ровный свет<br />и не слепит встречных водителей</Bubble>
        <Bubble title="Удобная посадка">Угол раскрытия дверей на 90° обеспечивает лёгкую посадку даже с крупным багажом в руках</Bubble>
      </div>
    </div>
  )
}

const MISUSE: [string, string][] = [
  ['misuse-proportions', 'Изменение расположения и размеров элементов'],
  ['misuse-effects', 'Применение эффектов: градиент, тень, обводка и т.п.'],
  ['misuse-clearspace', 'Несоблюдение охранной зоны, имя бренда не считывается'],
  ['misuse-distortion', 'Искажение, перспектива, деформация'],
  ['misuse-background', 'Фон перегружен деталями, недостаточный контраст'],
  ['misuse-lettering', 'Набор логотипа шрифтом, произвольный леттеринг'],
  ['misuse-photo', 'Детали фото мешают считыванию, недостаточный контраст'],
  ['misuse-rotation', 'Перевод в контур, поворот, отражение'],
  ['misuse-color', 'Некорректный выбор цвета, недостаточный контраст'],
]


/** UMO's chapters, from Платформа бренда to Пространства */
export function Chapters() {
  return (
    <>
          {/* ── Платформа бренда ── */}
          <Chapter id="brand" title="Платформа бренда">
              <Section>
                {/* Picture above the heading; the anchor sits on it so links land on the picture */}
                <div id="positioning" className="scroll-mt-24 lg:scroll-mt-6"><Fig name="positioning" w={912} h={456} alt="" /></div>
                <Head>
                  <H2>Позиционирование</H2>
                  <Text>
                    <p>UMO — это и есть ты. Больше, чем машина, это гаджет для человека.</p>
                    <p>Для мамы с детьми это безопасное пространство в городе. Для айтишника — утилитарный и технологичный транспорт. Для водителя такси — рабочий инструмент.</p>
                    <p>Для отца, который раз в месяц уезжает на рыбалку за сотню километров — машина с бардачком под блёсны и возможностью зарядить аккумулятор от обычной розетки на даче.</p>
                    <p>UMO не диктует сценарий, а подстраивается под тот, что есть сейчас.</p>
                  </Text>
                </Head>
              </Section>

              <Section>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-10">
                  <Head>
                    <H2 id="vision">Видение</H2>
                    <Text><p>Сделать электромобильность новой, доступной и естественной нормой жизни для миллионов людей уже сегодня.</p></Text>
                  </Head>
                  <Head>
                    <H2 id="mission">Миссия</H2>
                    <Text><p>Через умный транспорт трансформировать культуру повседневных поездок.</p></Text>
                  </Head>
                </div>
                <Fig name="umo5-kv" focus={72} w={912} h={456} />
              </Section>

              <Section>
                <Head>
                  <H2 id="audience">Аудитория</H2>
                  <Text><p>Современные люди, лояльные к технологиям — им важны персонализация и комфорт, а не статус ради статуса.</p></Text>
                </Head>
                <Fig name="audience" w={912} h={456} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                  <Head>
                    <p className="text-[24px] font-medium leading-none tracking-[-0.01em]">UMO 5</p>
                    <Text><p>Молодые городские — те, кто живёт в ритме и выбирает машину под свою мобильность здесь и сейчас.</p></Text>
                  </Head>
                  <Head>
                    <p className="text-[24px] font-medium leading-none tracking-[-0.01em]">UMO 8</p>
                    <Text><p>Семейный и представительский сегмент — те, для кого машина должна одинаково подходить и для путешествия с детьми, и для деловой поездки.</p></Text>
                  </Head>
                </div>
              </Section>
          </Chapter>

          {/* ── Коммуникация ── */}
          <Chapter id="communication" title="Коммуникация" loose>
            <Section>
              <Head>
                <H2 id="name">Имена</H2>
                <Text>
                  <p>UMO — Urban Mobility Object, объект городской мобильности. Читается «Умо», с ударением на первый слог.</p>
                  <p>Имя набирается латиницей, прописными и без точек: UMO. Имя модели складывается из имени бренда и цифры через пробел: UMO 5, UMO 8.</p>
                  <p>Написания «УМО», «Umo», «U.M.O.» и «UMO5» ошибочны.</p>
                  <p>Имя не обыгрывается: «Умка», «Умочка», «UMOпомрачительно» неуместны в рекламе и у блогеров. «Умка» остаётся сленгом владельцев.</p>
                </Text>
              </Head>
            </Section>

            <Section>
              <Head>
                <H2 id="descriptors">Дескрипторы</H2>
                {/* One text in two columns, as Имена */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 *:max-w-none">
                  <Text>
                    <p>Дескриптор поясняет имя и, в отличие от слогана, не меняется от кампании к кампании.</p>
                    <p>Дескриптор бренда: «Автомобильный бренд, созданный в технологическом партнёрстве с Яндексом».</p>
                  </Text>
                  <Text>
                    <p>Дескриптор модели складывается из её типа и слов «с технологиями Яндекса»:</p>
                    <p>UMO 5: электромобиль с технологиями Яндекса.</p>
                    <p>UMO 8: гибрид с технологиями Яндекса.</p>
                  </Text>
                </div>
              </Head>
            </Section>

            <Section>
              <Head>
                <H2 id="tone">Тон голоса</H2>
                <Text>
                  <p>Голос UMO — вдумчивый, искренний, партнёрский. Обращаемся на «вы». Говорим на языке людей, без пафоса и сложных метафор — наш язык живой и человечный.</p>
                  <p>Выстраиваем диалог с пользователем в каждой точке контакта. Там где позволяет формат, вместо констатации сухих технических терминов раскрываем их на примерах.</p>
                  <p>Рекламные клише категории и агрессивные восклицания не используем.</p>
                </Text>
              </Head>
              <Fig name="voice" w={912} h={456} />
            </Section>

            <Section>
              <H2 id="dictionary">Словарь</H2>
              <Dictionary rows={DICTIONARY} />
            </Section>

            <Section>
              <Head>
                <H2 id="examples">Примеры</H2>
                <Text><p>Лучше один раз увидеть: UMO говорит по-человечески и уважительно на вы.</p></Text>
              </Head>
              <Examples />
            </Section>
          </Chapter>

          {/* ── Логотип ── */}
          <Chapter id="logo" title="Логотип">
            <Section>
              <Text>
                <p>Логотип UMO не буквы, а модули.</p>
                <p>Словесный знак собран из элементов, как из конструктора — чистая геометрия и инженерия. Это визуальный эквивалент главной идеи бренда — город как система, а автомобиль как её умный, технологичный элемент.</p>
              </Text>
              <div className="group/preview flex flex-col gap-4 md:gap-6">
                <PreviewLink asset={{ file: 'umo-logo.svg' }} label="Скачать логотип, SVG">
                  <LogoPlate w={912} h={456} logo={480} bg="#f5f5f5" phone43 />
                </PreviewLink>
                <Assets items={[{ file: 'umo-logo.svg', label: 'Логотип UMO', also: [{ file: 'umo-logo-png.zip' }] }]} preview="umo-logo.svg" />
              </div>
            </Section>

            <Section>
              <Head>
                <H2 id="placement">Размещение на продукте</H2>
                <Text>
                  <p>Логотип остаётся собой в любом масштабе и материале.</p>
                  <p>В экстерьере это метка бренда и деталь, которая читается на ходу. В салоне — присутствие в ежедневной рутине.</p>
                  <p>Единый модуль для любого контекста.</p>
                </Text>
              </Head>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <Fig name="placement-exterior" w={912} h={456} className="sm:col-span-2" alt="Логотип на передней части UMO 8" />
                <Fig name="placement-interior" w={444} h={333} alt="Логотип на руле" />
                <Fig name="placement-badge" w={444} h={333} alt="Шильдик UMO на кузове" />
              </div>
            </Section>

            <Section>
              <Head>
                <H2 id="clearspace">Отступы и размер</H2>
                <Text>
                  <p>Минимальный отступ вокруг логотипа равен одной базовой единице: высоте логотипа (U). В пределах отступа нельзя размещать другие элементы.</p>
                  <p>Чтобы сохранить узнаваемость и четкость не уменьшайте размеры логотипа ниже рекомендуемых.</p>
                </Text>
              </Head>
              <div className="flex flex-col gap-4 md:gap-6">
                <Fig name="clearspace" w={912} h={456} phone43 alt="Схема охранного поля логотипа: U со всех сторон" />
                <Fig name="minsize" w={912} h={304} alt="Минимальный размер: аналоговый ≥20 мм, цифровой ≥40 px" />
              </div>
            </Section>

            <Section>
              <Head>
                <H2 id="logo-color">Цвет логотипа</H2>
                <Text><p>Цвет логотипа подбирается по контрасту, яркости и тону фона: белый или черный.</p></Text>
              </Head>
              <div className="flex flex-col gap-4 md:gap-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
                  <LogoPlate w={444} h={333} logo={240} bg="#000" dark caption="Белый для тёмного фона" />
                  <LogoPlate w={444} h={333} logo={240} bg="#f5f5f5" caption="Чёрный для светлого фона" />
                </div>
                <figure className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:gap-6">
                    <Photo name="color-photo" />
                    <LogoPlate w={210} h={280} logo={120} bg="#fc3f1d" dark />
                    <LogoPlate w={210} h={280} logo={120} bg="#ffea00" />
                    <Photo name="color-light" />
                  </div>
                  <Caption>Примеры подбора цвета. Фоны здесь только для наглядности, это не цвета бренда</Caption>
                </figure>
              </div>
            </Section>

            <Section>
              <Head>
                <H2 id="misuse">Ограничения</H2>
                <Text><p>Необходимо сохранять оригинальные пропорции и дизайн логотипа, чтобы избежать потери узнаваемости и искажений восприятия.</p></Text>
              </Head>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6">
                {MISUSE.map(([name, text]) => (
                  <Fig key={name} name={name} w={288} h={216} caption={text} cross alt={text} />
                ))}
              </div>
            </Section>

            <Section>
              <Head>
                <H2 id="icons">Логотип на иконках</H2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 *:max-w-none">
                  <Text>
                    <p>Размещая логотип на мелких форматах рекомендуется учитывать минимальные размеры и отступы.</p>
                    <p>Иконка сайта — исключение.</p>
                  </Text>
                  <Text>
                    <p>Иконка подходит для аватарки (юзерпика) дилера в соцсетях и мессенджерах, оформления профиля на площадках объявлений и карточки организации на картах.</p>
                  </Text>
                </div>
              </Head>
              <Previews className="flex flex-col gap-4 md:gap-6">
                <div className="grid grid-cols-1 min-[520px]:grid-cols-2 gap-4 md:gap-6">
                  <PreviewLink asset={{ file: 'umo-icon-white.svg' }} label="Скачать иконку, чёрный логотип на белом, SVG">
                    <Fig name="icon-userpic" w={444} h={333} caption="Юзерпик аккаунта соцсетей" />
                  </PreviewLink>
                  <PreviewLink asset={{ file: 'umo-favicon.svg' }} label="Скачать фавиконку, SVG">
                    <Fig name="icon-favicon-light" w={444} h={333} caption="Фавиконка и иконка закладок в браузере" alt="Фавиконка во вкладке светлого браузера" />
                  </PreviewLink>
                  <PreviewLink asset={{ file: 'umo-icon-black.svg' }} label="Скачать иконку, белый логотип на чёрном, SVG">
                    <Fig name="icon-app" w={444} h={333} caption="Иконка мобильного приложения" />
                  </PreviewLink>
                  <PreviewLink asset={{ file: 'umo-favicon.svg' }} label="Скачать фавиконку, SVG">
                    <Fig name="icon-favicon" w={444} h={333} alt="Фавиконка во вкладке тёмного браузера" />
                  </PreviewLink>
                </div>
                <Assets items={[{ file: 'umo-icon-white.svg', label: 'Иконка UMO на белом', also: [{ file: 'umo-icon-white.png' }] }, { file: 'umo-icon-black.svg', label: 'Иконка UMO на чёрном', also: [{ file: 'umo-icon-black.png' }] }, { file: 'umo-favicon.svg', label: 'Фавиконка UMO', also: [{ file: 'umo-favicon.ico' }] }]} />
              </Previews>
            </Section>

            <Section>
              <Head>
                <H2 id="cobranding">Кобрендинг</H2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 *:max-w-none">
                  <Text>
                    <p>Для совместного брендинга с логотипом UMO используйте квадратный или горизонтальный логотип (словесный знак) другой компании.</p>
                    <p>Следите за размерами логотипов, их расположением и правилами отступов.</p>
                  </Text>
                  <Text>
                    <p>Высота разделительной линии между логотипами равна высоте логотипа UMO, ширина 1/30 высоты.</p>
                    <p>Любой кобрендинг требует одобрения от команды бренда и юридической команды.</p>
                  </Text>
                </div>
              </Head>
              {/* Two columns, a scheme over its example; the columns stack below 640 px */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
                <div className="group/preview flex flex-col gap-4 md:gap-6">
                  <Zoom label="Схема кобрендинга с квадратным логотипом">
                    <Fig name="cobrand-square" w={444} h={333} alt="Схема кобрендинга с квадратным логотипом" />
                  </Zoom>
                  <PreviewLink asset={{ file: 'umo-yandex.svg' }} label="Скачать логотип UMO | Яндекс, SVG">
                    <Fig name="cobrand-square-example" w={444} h={333} alt="UMO и Яндекс" />
                  </PreviewLink>
                  <Assets items={[{ file: 'umo-yandex.svg', label: 'Лок-ап UMO | Яндекс', also: [{ file: 'umo-yandex-png.zip' }] }]} preview="umo-yandex.svg" />
                </div>
                <div className="flex flex-col gap-4 md:gap-6">
                  <Zoom label="Схема кобрендинга с горизонтальным логотипом">
                    <Fig name="cobrand-horizontal" w={444} h={333} alt="Схема кобрендинга с горизонтальным логотипом" />
                  </Zoom>
                  <Fig name="cobrand-horizontal-example" w={444} h={333} alt="UMO и EVM" />
                </div>
              </div>
            </Section>
          </Chapter>

          {/* ── Типографика ── */}
          <Chapter id="typography" title="Типографика">
            <Section>
              <Text>
                <p>Гарнитура CoFo Sans — основа визуальной идентификации и стиля бренда UMO. Функциональный и разборчивый, он имеет несколько весов для полной свободы выражения.</p>
                <p>Когда использование CoFo Sans невозможно, допускается применение альтернатив, доступных в популярных рабочих пространствах.</p>
              </Text>
              <div className="flex flex-col gap-4 md:gap-6">
                <figure className="flex flex-col gap-3">
                  <div className="flex aspect-4/3 min-[520px]:aspect-2/1 items-center justify-center bg-surface">
                    <p className="text-[48px] sm:text-[72px] md:text-[96px] font-medium leading-none tracking-[-0.01em]">CoFo Sans</p>
                  </div>
                  <Caption>Базовая гарнитура</Caption>
                </figure>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6">
                  <Fig name="font-geist" w={288} h={216} caption="Альтернатива для Google" alt="Geist" href={GEIST_ZIP} />
                  <Fig name="font-helvetica" w={288} h={216} caption="Альтернатива для MacOS" alt="Helvetica Neue" />
                  <Fig name="font-arial" w={288} h={216} caption="Альтернатива для Windows" alt="Arial" />
                </div>
              </div>
            </Section>

            <Section>
              <Head>
                <H2 id="type-styles">Стили и иерархия</H2>
                <Text>
                  <p>CoFo Sans подходит для оформления любых маркетинговых материалов в цифровой и аналоговой среде.</p>
                  <p>Среди доступных весов гарнитуры, рекомендуется использовать пару:</p>
                  <ul className="list-disc pl-[30px] flex flex-col gap-2">
                    <li>CoFo Sans Medium для заголовков и акциденции</li>
                    <li>CoFo Sans Regular для набора основного массива текста</li>
                  </ul>
                </Text>
              </Head>
              <Fig name="type-styles" w={912} h={456} alt="Заголовок 3 rem, подзаголовок 1.5 rem, основной текст 1 rem" />
            </Section>
          </Chapter>

          {/* ── Леттеринг ── */}
          <Chapter id="lettering" title="Леттеринг" loose>
            <Section>
              <H2 id="lettering-models">Модели</H2>
              <div className="flex flex-col gap-4 md:gap-6">
                <div className="grid grid-cols-1 min-[520px]:grid-cols-2 gap-4 md:gap-6">
                  <Fig name="lettering-model8" w={444} h={333} alt="Леттеринг MODEL 8 и номерная плашка UMO 8" />
                  <Fig name="lettering-model5" w={444} h={333} alt="Леттеринг MODEL 5 и номерная плашка UMO 5" />
                  <Fig name="lettering-umo8" w={444} h={333} alt="Леттеринг на UMO 8" />
                  <Fig name="lettering-umo5" w={444} h={333} alt="Леттеринг на кузове UMO 5" />
                </div>
                {/* Columns follow the pictures: UMO 8 on the left, UMO 5 on the right. */}
                <Assets
                  early
                  items={[
                    { file: 'umo-model-8.svg', label: 'Леттеринг MODEL 8', also: [{ file: 'umo-model-8-png.zip' }] }, { file: 'umo-plate-8-svg.zip', label: 'Номерная плашка UMO 8' },
                    { file: 'umo-model-5.svg', label: 'Леттеринг MODEL 5', also: [{ file: 'umo-model-5-png.zip' }] }, { file: 'umo-plate-5-svg.zip', label: 'Номерная плашка UMO 5' },
                  ]}
                />
              </div>
            </Section>

            <Section>
              <H2 id="made-in-moscow">Сделано в Москве</H2>
              <div className="grid grid-cols-1 min-[520px]:grid-cols-2 gap-4 md:gap-6">
                <Fig name="moscow-umo5" w={444} h={333} alt="Шильдик «Сделано в Москве» на UMO 5" />
                <Fig name="moscow-umo8" w={444} h={333} alt="Шильдик «Сделано в Москве» на UMO 8" />
              </div>
            </Section>
          </Chapter>

          {/* ── Цвет ── */}
          <Chapter id="color" title="Цвет">
            <Section>
              <Text>
                <p>У UMO два цвета — чёрный и белый. Яркого цвета у бренда нет: его приносят автомобиль, фотография и среда, а чёрно-белая графика не спорит с ними и узнаётся на любом фоне.</p>
                <p>В печати чёрный двух видов: глубокий составной для плёнки, вывесок и больших плашек, чистый K100 для текста и мелких деталей. Серые — служебные: фон, линии и подписи.</p>
                <p>Как выбрать между чёрным и белым логотипом — в разделе <a href="#logo-color" className={TEXT_LINK}>Цвет логотипа</a>.</p>
              </Text>
              <div className="flex flex-col gap-4 md:gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  {COLORS.main.map((c, i) => <Swatch key={c.name} {...c} className={`aspect-4/3 ${i === COLORS.main.length - 1 ? 'min-[520px]:max-sm:hidden' : ''}`} />)}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6">
                  {/* From 520 px to sm the last main colour (white) is one of the small tiles, two by two under the
                      first; narrower, its rows («На тёмном белая краска») don't fit a small tile, and it stays large */}
                  {[COLORS.main[COLORS.main.length - 1]].map(c => <Swatch key={c.name} {...c} className="aspect-4/3 hidden max-sm:p-4 min-[520px]:max-sm:flex" />)}
                  {COLORS.service.map(c => <Swatch key={c.name} {...c} className="aspect-4/3 max-sm:p-4" />)}
                </div>
              </div>
            </Section>
          </Chapter>

          {/* ── Фотография ── */}
          <Chapter id="photography" title="Фотография">
            <Section>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 *:max-w-none">
                <Text><p>Без излишней постановочности и драмы. Изображение захватывает взгляд, потому что все, что видит зритель, происходит здесь и сейчас.</p></Text>
                <Text><p>Автомобили становятся частью мира аудитории, но показаны в выгодном ракурсе, который подчеркивает преимущества или рассказывает историю за счет окружения.</p></Text>
              </div>
              <Fig name="keyvisual" w={912} h={456} />
            </Section>

            <Section>
              <Head>
                <H2 id="photo-umo5">UMO 5</H2>
                <Text><p>Снимки UMO Model 5 и пример их применения в рекламе</p></Text>
              </Head>
              <div className="flex flex-col gap-4 md:gap-6">
                <Fig name="umo5-kv" focus={72} w={912} h={456} alt="UMO 5" />
                <div className="grid grid-cols-1 sm:grid-cols-[600fr_288fr] gap-4 md:gap-6">
                  <Poster bg="umo5-banner-bg" w={600} h={368} title="Новый UMO 5" subtitle={UMO5_SUBTITLE} alt="Горизонтальный баннер UMO 5" />
                  <Poster bg="umo5-square-bg" w={288} h={368} title="Новый UMO 5" subtitle={UMO5_SUBTITLE} center alt="Вертикальный баннер UMO 5" />
                </div>
              </div>
            </Section>

            <Section>
              <Head>
                <H2 id="photo-umo8">UMO 8</H2>
                <Text><p>Снимки UMO Model 8 и пример их применения в рекламе</p></Text>
              </Head>
              <div className="flex flex-col gap-4 md:gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-[288fr_600fr] gap-4 md:gap-6">
                  <div className="order-2 sm:order-none">
                    <Poster bg="umo8-square-bg" w={288} h={368} title="Новый UMO 8" subtitle={UMO8_SUBTITLE} center alt="Вертикальный баннер UMO 8" />
                  </div>
                  <Poster bg="umo8-banner-bg" w={600} h={368} title="Новый UMO 8" subtitle={UMO8_SUBTITLE} alt="Горизонтальный баннер UMO 8" />
                </div>
                <Fig name="umo8-kv" w={912} h={456} alt="UMO 8" />
              </div>
            </Section>
          </Chapter>

          {/* ── Пространства ── */}
          <Chapter id="spaces" title="Пространства">
            <Section>
              <Text>
                <p>Пространства продолжают бренд за пределами экрана и бумаги.</p>
                <p>Здесь работают те же принципы: спокойная геометрия, понятная навигация и ничего лишнего вокруг автомобиля.</p>
              </Text>
              <Fig name="dealer" w={912} h={456} alt="Дилерский центр UMO и Яндекса" />
            </Section>

            {/* Дилерский центр, on hold: back as a section with { id: 'dealer', title: 'Дилерский центр' } in NAV,
                and drop `dealer` from OLD_ANCHORS.
            <Section>
              <Head>
                <H2 id="dealer">Дилерский центр</H2>
                <Text>
                  <p>Первое место, где UMO можно потрогать.</p>
                  <p>Салоны собраны по единой системе, поэтому UMO узнаётся с порога в любом городе и на любой площадке.</p>
                </Text>
              </Head>
            </Section>
            */}
          </Chapter>
    </>
  )
}

/** Контакты' text */
export function Contact() {
  return (
                <Text wide>
                  <p>Если ответа нет в стандартах или макет вывески, рекламы или другого носителя нужно согласовать, <a href={SUPPORT_BOT} target="_blank" rel="noopener" className={TEXT_LINK}>напишите боту поддержки</a>. Приложите макет и расскажите, где он будет размещён, — разберёмся вместе.</p>
                  <p>Спасибо, что делаете UMO вместе с нами.</p>
                </Text>
  )
}

export const FOOTER = '© 2026 ООО «ЭМ РУС». Стандарты бренда UMO'
