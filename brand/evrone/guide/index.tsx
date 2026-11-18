import type { GuideChapter } from '@/brand'
import { Assets, Bubble, Caption, Chapter, Dictionary, Fig, H2, Head, LogoPlate, Photo, PhotoCard, PreviewLink, Previews, Section, Swatch, Text, type Medium, type Rule } from '@/guide/parts'
import { TEXT_LINK, SUPPORT_BOT } from '@/ui/links'
import { COLORS } from '@brand/colors'

// Evrone's guide: its chapters and what they say, the first screen and the contacts. The page around them, the
// contents, Материалы and the editor are the core's (`src/guide/Guide.tsx`), the blocks they're written with too
// (`src/guide/parts.tsx`). The texts are from evrone.ru and evrone.com, the pictures from Figma «Evrone Identity» and
// Yandex Disk «04 Identity»; the schemes and the misuse pictures are drawn from the logo (see the brand's README).

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
      { id: 'placement', title: 'Размещение на носителях' },
      { id: 'clearspace', title: 'Отступы и размер' },
      { id: 'logo-color', title: 'Цвет логотипа' },
      { id: 'misuse', title: 'Ограничения' },
      { id: 'icons', title: 'Знак' },
      { id: 'sponsorship', title: 'Спонсорство' },
    ],
  },
  { id: 'typography', title: 'Типографика', children: [{ id: 'type-styles', title: 'Стили и иерархия' }] },
  { id: 'color', title: 'Цвет' },
  {
    id: 'graphics',
    title: 'Графика',
    children: [
      { id: 'illustrations', title: 'Иллюстрации' },
      { id: 'services', title: '3D-иконки' },
      { id: 'backgrounds', title: 'Фоны' },
    ],
  },
]

export const OLD_ANCHORS: Record<string, string> = {}

/** The first screen: a still, no film (`video` empty) */
export const HERO = { video: '', small: '', poster: 'hero', still: 'hero', stillAlt: 'Градиент Evrone из чёрного в оранжевый' }

/** The line under the first screen, the brand's slogan */
export const STATEMENT = 'Превращаем идеи в цифровые продукты'

/** Материалы' first sentence, before the list of what the generators make */
export const MATERIALS_LEAD = 'Готовый дизайн для офиса, встреч и событий Evrone:'

/** Материалы' first sentence lists the generators in this order */
export const INTRO_ORDER = ['/business-card', '/hours-sign']

/** Материалы' pictures drawn for the guide: none yet, each generator gets its own preview or a grey card */
export const DRAWN: Medium[] = []

const DICTIONARY: Rule[] = [
  { good: 'Команда, специалисты, эксперты уровня middle и senior', bad: 'Ресурсы, кодеры, аутсорс-фабрика', why: 'За каждым проектом стоят люди: говорим о них с уважением' },
  { good: '18 лет, 400+ проектов, 300+ специалистов', bad: 'Огромный опыт, лидер рынка, лучшие из лучших', why: 'Убеждают цифры и факты, а не эпитеты' },
  { good: 'Ruby, Python, Go, Elixir, Rust', bad: 'Передовой стек, инновационные технологии', why: 'Называем технологии по имени: наша аудитория в них разбирается' },
  { good: 'Разработка программного обеспечения, продукт, сервис', bad: 'Софт под ключ, IT-решения, диджитал', why: 'Избегаем размытых слов и штампов категории' },
  { good: 'Заголовки без точек в конце, точки в конце предложений', bad: 'Заголовки с точкой, нет знаков препинания', why: 'Пунктуация и оформление текстовых стилей по правилам русского языка' },
]

function Examples() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
      <div className="flex flex-col gap-4 md:gap-6">
        <Bubble title="Нулевой спринт">Исследуем идею, пишем технические требования и готовим презентацию для инвесторов</Bubble>
        <Bubble title="Аутстаффинг">Усилим вашу команду нужной экспертизой на время, без найма и оформления</Bubble>
        <Bubble title="Аутсорсинг">Берём на себя аналитику, дизайн и код и отвечаем за сроки</Bubble>
      </div>
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="max-sm:order-1">
          <Bubble title="Evrone — компания по разработке программных продуктов. 18 лет, 400+ проектов и 300+ специалистов уровня middle и senior" />
        </div>
        <PhotoCard name="voice-what" grow title="Что такое Evrone? Команда, которая работает удалённо с 2008 года" />
      </div>
      <div className="flex flex-col gap-4 md:gap-6">
        <PhotoCard name="voice-onboarding" grow title="Онбординг: помогаем освоиться с первого дня" />
        <Bubble title="Open source">Делимся инструментами, которыми сами пользуемся каждый день</Bubble>
        <Bubble title="Конференции">Проводим RubyRussia и выступаем на HighLoad++ и TeamLead Conf</Bubble>
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
  ['misuse-rotation', 'Перевод в контур, поворот, отражение'],
  ['misuse-color', 'Некорректный выбор цвета, недостаточный контраст'],
]

// Inter's own release: Google Fonts has no direct download link any more, only its specimen page
const INTER_ZIP = 'https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip'

/** A download, at the site's root */
const download = (file: string) => `${import.meta.env.BASE_URL}downloads/${file}`

/** Evrone's chapters, from Платформа бренда to Графика */
export function Chapters() {
  return (
    <>
          {/* ── Платформа бренда ── */}
          <Chapter id="brand" title="Платформа бренда">
              <Section>
                <div id="positioning" className="scroll-mt-24 lg:scroll-mt-6"><Fig name="positioning" w={912} h={456} alt="Привет! Это Evrone" /></div>
                <Head>
                  <H2>Позиционирование</H2>
                  <Text>
                    <p>Evrone — команда разработки программных продуктов. С 2008 года делаем для бизнеса сложные сервисы: с высокой нагрузкой, большим количеством пользователей и данных.</p>
                    <p>Нам доверяют аналитику, дизайн, разработку, инфраструктуру и поддержку — потому что мы разбираемся в процессах, делимся опытом и хорошо делаем свою работу.</p>
                    <p>Мы делаем open source, проводим конференции и выступаем на главных IT-событиях: экспертиза Evrone видна не только клиентам.</p>
                  </Text>
                </Head>
              </Section>

              <Section>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-10">
                  <Head>
                    <H2 id="vision">Видение</H2>
                    <Text><p>Технологии способны изменить любой бизнес. Мы помогаем раскрыть их потенциал — решениями, сделанными под задачу, а не из коробки.</p></Text>
                  </Head>
                  <Head>
                    <H2 id="mission">Миссия</H2>
                    <Text><p>Стать любимой командой разработки для каждого клиента.</p></Text>
                  </Head>
                </div>
                <Fig name="team" w={912} h={456} focus={30} alt="Evrone Design & Development Team" />
              </Section>

              <Section>
                <Head>
                  <H2 id="audience">Аудитория</H2>
                  <Text><p>Бизнес, которому не подходят коробочные решения: корпорации и стартапы из 70+ стран. Большая часть клиентов возвращается к нам снова.</p></Text>
                </Head>
                <Fig name="audience" w={912} h={456} alt="Рукопожатие через порталы" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                  <Head>
                    <p className="text-[24px] font-medium leading-none tracking-[-0.01em]">Корпорации</p>
                    <Text><p>Усиливаем in-house команды экспертизой, разбираем монолиты, поддерживаем legacy и сервисы с высокой нагрузкой.</p></Text>
                  </Head>
                  <Head>
                    <p className="text-[24px] font-medium leading-none tracking-[-0.01em]">Стартапы</p>
                    <Text><p>Проходим путь от идеи и нулевого спринта до MVP, презентации для инвесторов и развития после релиза.</p></Text>
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
                  <p>Имя набирается латиницей, с прописной: Evrone. Строчными — только в логотипе.</p>
                  <p>Имя не переводится и не пишется кириллицей: «команда Evrone», «в Evrone». Написания «EVRONE», «Еврон» и «Эврон» ошибочны.</p>
                  <p>ООО «ЕВРОНЕ Девелопмент» — юридическое название: для договоров, реквизитов и табличек на офисе.</p>
                  <p>Проекты и события называются по формуле «Evrone + слово»: Evrone Fest, Evrone Power, Evrone Mentoring. У крупных событий свои логотипы.</p>
                </Text>
              </Head>
              <div className="grid grid-cols-1 min-[520px]:grid-cols-3 gap-4 md:gap-6">
                <Fig name="event-fest" w={288} h={288} caption="Evrone Fest" alt="Логотип Evrone Fest" />
                <Fig name="event-power" w={288} h={288} caption="Evrone Power" alt="Логотип Evrone Power" />
                <Fig name="event-family" w={288} h={288} caption="Сообщество сотрудников family:)" alt="family:)" />
              </div>
            </Section>

            <Section>
              <Head>
                <H2 id="descriptors">Дескрипторы</H2>
                {/* One text in two columns, as Имена */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 *:max-w-none">
                  <Text>
                    <p>Дескриптор поясняет имя и, в отличие от слогана, не меняется от кампании к кампании.</p>
                    <p>Дескриптор бренда: «Компания по разработке программных продуктов». По-английски: «Custom software development company».</p>
                  </Text>
                  <Text>
                    <p>Слоган: «Превращаем идеи в цифровые продукты».</p>
                    <p>Рядом с дескриптором уместны факты: 18 лет, 400+ проектов, 300+ специалистов.</p>
                  </Text>
                </div>
              </Head>
            </Section>

            <Section>
              <Head>
                <H2 id="tone">Тон голоса</H2>
                <Text>
                  <p>Голос Evrone — экспертный, открытый, партнёрский. Обращаемся на «вы», о себе говорим «мы»: за каждым проектом стоит команда.</p>
                  <p>Подтверждаем слова фактами, а не эпитетами: сроками, цифрами, названиями технологий и клиентов.</p>
                  <p>В соцсетях и на событиях можно шутить на языке разработчиков, но без снисхождения к аудитории. Как в профиле Evrone: «We did Meta before it was cool».</p>
                </Text>
              </Head>
              <Fig name="voice" w={912} h={456} alt="Evrone family" />
            </Section>

            <Section>
              <H2 id="dictionary">Словарь</H2>
              <Dictionary rows={DICTIONARY} />
            </Section>

            <Section>
              <Head>
                <H2 id="examples">Примеры</H2>
                <Text><p>Лучше один раз увидеть: Evrone говорит по делу, с фактами и на «вы».</p></Text>
              </Head>
              <Examples />
            </Section>
          </Chapter>

          {/* ── Логотип ── */}
          <Chapter id="logo" title="Логотип">
            <Section>
              <Text>
                <p>Логотип Evrone — словесный знак, набранный строчными.</p>
                <p>Простой и спокойный, он не спорит с продуктами, которые мы делаем, и одинаково читается на визитке, экране и стенде.</p>
              </Text>
              <div className="group/preview flex flex-col gap-4 md:gap-6">
                <PreviewLink asset={{ file: 'evrone-logo-b.svg' }} label="Скачать логотип, SVG">
                  <LogoPlate w={912} h={456} logo={480} bg="#f5f5f5" phone43 />
                </PreviewLink>
                <Assets items={[{ file: 'evrone-logo-b.svg', label: 'Логотип Evrone, чёрный', also: [{ file: 'evrone-logo-b.png' }] }, { file: 'evrone-logo-w.svg', label: 'Логотип Evrone, белый', also: [{ file: 'evrone-logo-w.png' }] }]} preview="evrone-logo-b.svg" />
              </div>
            </Section>

            <Section>
              <Head>
                <H2 id="placement">Размещение на носителях</H2>
                <Text>
                  <p>Логотип остаётся собой в любом масштабе: от визитки до стенда на конференции.</p>
                  <p>На оранжевом и чёрном он белый, на светлом — чёрный.</p>
                </Text>
              </Head>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <Fig name="placement-stand" w={912} h={456} className="sm:col-span-2" alt="Стенд Evrone на конференции" />
                <Fig name="placement-card" w={444} h={333} alt="Визитка Evrone, обе стороны" />
                <Fig name="placement-poster" w={444} h={333} alt="Плакат Evrone Development Team" />
              </div>
            </Section>

            <Section>
              <Head>
                <H2 id="clearspace">Отступы и размер</H2>
                <Text>
                  <p>Минимальный отступ вокруг логотипа равен его высоте — высоте строчной «e». В пределах отступа нельзя размещать другие элементы.</p>
                  <p>Чтобы сохранить узнаваемость и чёткость, не уменьшайте логотип меньше рекомендуемых размеров.</p>
                </Text>
              </Head>
              <div className="flex flex-col gap-4 md:gap-6">
                <Fig name="clearspace" w={912} h={456} phone43 alt="Схема охранного поля логотипа: высота «e» со всех сторон" />
                <Fig name="minsize" w={912} h={304} alt="Минимальный размер: аналоговый ≥20 мм, цифровой ≥40 px" />
              </div>
            </Section>

            <Section>
              <Head>
                <H2 id="logo-color">Цвет логотипа</H2>
                <Text><p>Логотип белый или чёрный: цвет подбирается по контрасту, яркости и тону фона. На оранжевом логотип всегда белый.</p></Text>
              </Head>
              <div className="flex flex-col gap-4 md:gap-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
                  <LogoPlate w={444} h={333} logo={240} bg="#000" dark caption="Белый для тёмного фона" />
                  <LogoPlate w={444} h={333} logo={240} bg="#f5f5f5" caption="Чёрный для светлого фона" />
                </div>
                <figure className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:gap-6">
                    <Photo name="color-gradient" />
                    <LogoPlate w={210} h={280} logo={120} bg="#ff4400" dark />
                    <LogoPlate w={210} h={280} logo={120} bg="#eeddcc" />
                    <Photo name="color-chalk" />
                  </div>
                  <Caption>Примеры подбора цвета на фонах бренда: градиенте, оранжевом, песочном и меловой текстуре</Caption>
                </figure>
              </div>
            </Section>

            <Section>
              <Head>
                <H2 id="misuse">Ограничения</H2>
                <Text><p>Необходимо сохранять оригинальные пропорции и дизайн логотипа, чтобы избежать потери узнаваемости и искажений восприятия.</p></Text>
              </Head>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:gap-6">
                {MISUSE.map(([name, text]) => (
                  <Fig key={name} name={name} w={288} h={216} caption={text} cross alt={text} />
                ))}
              </div>
            </Section>

            <Section>
              <Head>
                <H2 id="icons">Знак</H2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 *:max-w-none">
                  <Text>
                    <p>Знак «e» — короткая форма логотипа для мелких форматов, где словесный знак не прочитается.</p>
                    <p>Основной вариант — белая «e» на оранжевом, на тёмных фонах — на чёрном.</p>
                  </Text>
                  <Text>
                    <p>Знак подходит для аватарки в соцсетях и мессенджерах, иконки приложения и сайта, карточки компании на картах.</p>
                  </Text>
                </div>
              </Head>
              <Previews className="flex flex-col gap-4 md:gap-6">
                <div className="grid grid-cols-1 min-[520px]:grid-cols-2 gap-4 md:gap-6">
                  <PreviewLink asset={{ file: 'evrone-icon-a.svg' }} label="Скачать знак на оранжевом, SVG">
                    <figure className="flex flex-col gap-3">
                      <div className="flex aspect-4/3 items-center justify-center bg-surface">
                        <img src={download('evrone-icon-a.svg')} alt="Знак Evrone в круглой аватарке" className="w-[36%] rounded-full" />
                      </div>
                      <Caption>Аватарка в соцсетях и мессенджерах</Caption>
                    </figure>
                  </PreviewLink>
                  <PreviewLink asset={{ file: 'evrone-icon-b.svg' }} label="Скачать знак на чёрном, SVG">
                    <figure className="flex flex-col gap-3">
                      <div className="flex aspect-4/3 items-center justify-center bg-surface">
                        <img src={download('evrone-icon-b.svg')} alt="Знак Evrone на иконке приложения" className="w-[36%] rounded-[22.5%]" />
                      </div>
                      <Caption>Иконка приложения</Caption>
                    </figure>
                  </PreviewLink>
                </div>
                <Assets items={[{ file: 'evrone-icon-a.svg', label: 'Знак Evrone на оранжевом', also: [{ file: 'evrone-icon-a.png' }] }, { file: 'evrone-icon-b.svg', label: 'Знак Evrone на чёрном', also: [{ file: 'evrone-icon-b.png' }] }]} />
              </Previews>
            </Section>

            <Section>
              <Head>
                <H2 id="sponsorship">Спонсорство</H2>
                <Text>
                  <p>Когда Evrone поддерживает конференцию, митап или open source проект, используйте знак sponsored by evrone.</p>
                  <p>Знак не собирается заново из логотипа и текста. Отступы — как у логотипа.</p>
                </Text>
              </Head>
              <div className="group/preview flex flex-col gap-4 md:gap-6">
                <PreviewLink asset={{ file: 'evrone-sponsored.svg' }} label="Скачать знак спонсора, SVG">
                  <div className="flex aspect-4/3 min-[520px]:aspect-2/1 items-center justify-center bg-surface">
                    <img src={download('evrone-sponsored.svg')} alt="sponsored by evrone" className="w-[40%]" />
                  </div>
                </PreviewLink>
                <Assets items={[{ file: 'evrone-sponsored.svg', label: 'Знак спонсора Evrone' }]} preview="evrone-sponsored.svg" />
              </div>
            </Section>
          </Chapter>

          {/* ── Типографика ── */}
          <Chapter id="typography" title="Типографика">
            <Section>
              <Text>
                <p>Гарнитура Suisse Int'l — основа визуального стиля Evrone. Бренд использует одно её начертание, Book: и для заголовков, и для текста.</p>
                <p>Когда Suisse Int'l недоступен, допускаются бесплатные и системные альтернативы. Редактор материалов набран Inter.</p>
              </Text>
              <div className="flex flex-col gap-4 md:gap-6">
                <figure className="flex flex-col gap-3">
                  <div className="flex aspect-4/3 min-[520px]:aspect-2/1 items-center justify-center bg-surface">
                    <p className="text-[48px] sm:text-[72px] md:text-[96px] leading-none tracking-[-0.03em]">Suisse Int'l</p>
                  </div>
                  <Caption>Базовая гарнитура</Caption>
                </figure>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6">
                  <Fig name="font-inter" w={288} h={216} caption="Альтернатива для Google и веба" alt="Inter" href={INTER_ZIP} />
                  <Fig name="font-helvetica" w={288} h={216} caption="Альтернатива для macOS" alt="Helvetica Neue" />
                  <Fig name="font-arial" w={288} h={216} caption="Альтернатива для Windows и Google Документов" alt="Arial" />
                </div>
              </div>
            </Section>

            <Section>
              <Head>
                <H2 id="type-styles">Стили и иерархия</H2>
                <Text>
                  <p>Иерархия строится размером, а не насыщенностью: начертание одно.</p>
                  <p>Крупный текст набирается плотнее: заголовки — с разрядкой от −2 до −4%, основной текст — без разрядки. Так набраны визитка, табличка и плакаты Evrone.</p>
                </Text>
              </Head>
              <figure className="flex flex-col gap-3">
                <div className="flex flex-col justify-center gap-6 bg-surface p-6 md:aspect-2/1 md:p-12">
                  <p className="text-[40px] leading-none tracking-[-0.035em] md:text-[64px]">Превращаем идеи в&nbsp;цифровые продукты</p>
                  <p className="text-[20px] leading-[1.2] tracking-[-0.02em] md:text-[28px]">Разработка программного обеспечения на&nbsp;заказ</p>
                  <p className="max-w-[560px] text-[16px] leading-[1.4]">Evrone — компания по разработке программных продуктов. Помогаем бизнесу реализовывать амбициозные проекты, используя современные подходы и технологии.</p>
                </div>
                <Caption>Заголовок, подзаголовок и основной текст</Caption>
              </figure>
            </Section>
          </Chapter>

          {/* ── Цвет ── */}
          <Chapter id="color" title="Цвет">
            <Section>
              <Text>
                <p>Основные цвета Evrone — чёрный и оранжевый. Оранжевый — акцент: фон знака, обложек и событий; чёрный — текст и тёмные фоны. Белый и песочный — фоны.</p>
                <p>В печати чёрный двух видов: составной для фонов и больших плашек, чистый K100 для текста и мелких деталей.</p>
                <p>Как выбрать цвет логотипа — в разделе <a href="#logo-color" className={TEXT_LINK}>Цвет логотипа</a>.</p>
              </Text>
              <div className="flex flex-col gap-4 md:gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  {COLORS.main.map(c => <Swatch key={c.name} {...c} className="aspect-4/3" />)}
                </div>
                <div className="grid grid-cols-2 gap-4 md:gap-6">
                  {COLORS.service.map(c => <Swatch key={c.name} {...c} className="aspect-4/3 max-sm:p-4" />)}
                </div>
              </div>
            </Section>
          </Chapter>

          {/* ── Графика ── */}
          <Chapter id="graphics" title="Графика">
            <Section>
              <Head>
                <H2 id="illustrations">Иллюстрации</H2>
                <Text>
                  <p>Персонажи Evrone — эмоциональные и с юмором, в оранжево-чёрной гамме с зерном на белом фоне.</p>
                  <p>Они объясняют сложное: процессы, форматы работы, найм. Одна иллюстрация — одна мысль.</p>
                </Text>
              </Head>
              <div className="grid grid-cols-1 min-[520px]:grid-cols-2 gap-4 md:gap-6">
                <Fig name="graphics-hero" w={912} h={456} className="min-[520px]:col-span-2" alt="Разработчик-путешественник между окнами с кодом" />
                <Fig name="graphics-heroes" w={444} h={333} alt="Персонажи с табличками HERO и FULL STACK" />
                <Fig name="graphics-gym" w={444} h={333} alt="Команда в спортзале" />
                <Fig name="graphics-chick" w={444} h={333} alt="Персонаж-цыплёнок показывает пальцем" />
                <Fig name="graphics-final" w={444} h={333} alt="Персонаж с пачкой денег" />
              </div>
            </Section>

            <Section>
              <Head>
                <H2 id="services">3D-иконки</H2>
                <Text><p>Услуги показывают 3D-иконки на песочном фоне: белый, оранжевый и чёрный пластик, мягкий свет.</p></Text>
              </Head>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6">
                <Fig name="service-backend" w={288} h={288} alt="Backend" />
                <Fig name="service-frontend" w={288} h={288} alt="Frontend" />
                <Fig name="service-design" w={288} h={288} alt="Design" />
                <Fig name="service-devops" w={288} h={288} alt="DevOps" />
                <Fig name="service-outstaff" w={288} h={288} alt="Outstaff" />
                <Fig name="service-zero" w={288} h={288} alt="Sprint Zero" />
              </div>
            </Section>

            <Section>
              <Head>
                <H2 id="backgrounds">Фоны</H2>
                <Text><p>Градиент из чёрного в оранжевый и оранжевый фон — для обложек и соцсетей; угольная и меловая текстуры — для печати и мерча.</p></Text>
              </Head>
              <div className="flex flex-col gap-4 md:gap-6">
                <div className="grid grid-cols-2 gap-4 md:gap-6">
                  <Fig name="back-gradient" w={444} h={333} caption="Градиент" alt="Градиент из чёрного в оранжевый" />
                  <Fig name="back-orange" w={444} h={333} caption="Оранжевый" alt="Оранжевый фон" />
                  <Fig name="back-coal" w={444} h={333} caption="Уголь" alt="Угольная текстура" />
                  <Fig name="back-chalk" w={444} h={333} caption="Мел" alt="Меловая текстура" />
                </div>
                <Assets items={[{ file: 'evrone-back-gradient.jpg', label: 'Градиент' }, { file: 'evrone-back-orange.jpg', label: 'Оранжевый фон' }]} />
              </div>
            </Section>
          </Chapter>
    </>
  )
}

/** Контакты' text */
export function Contact() {
  return (
                <Text wide>
                  <p>Если ответа нет в стандартах или макет нужно согласовать, <a href={SUPPORT_BOT} target="_blank" rel="noopener" className={TEXT_LINK}>напишите нам</a>. Приложите макет и расскажите, где он будет размещён, — разберёмся вместе.</p>
                  <p>Спасибо, что делаете Evrone вместе с нами.</p>
                </Text>
  )
}

export const FOOTER = '© 2026 ООО «ЕВРОНЕ Девелопмент». Стандарты бренда Evrone'
