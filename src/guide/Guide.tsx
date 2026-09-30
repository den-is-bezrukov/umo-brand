import { useEffect, useState, type ReactNode } from 'react'
import logo from '@/assets/guide/logo.svg'

// Figures are exported from Figma (UMO | Evrone, node 4810:686) at 2x and
// cropped per frame — see "Brand guide" in AGENTS.md for how to refresh them.
const images = import.meta.glob<string>('../assets/guide/*.webp', { eager: true, import: 'default' })
const img = (name: string) => images[`../assets/guide/${name}.webp`]

type NavItem = { id: string; title: string; children?: { id: string; title: string }[] }

const NAV: NavItem[] = [
  {
    id: 'positioning',
    title: 'Позиционирование',
    children: [
      { id: 'vision', title: 'Видение' },
      { id: 'mission', title: 'Миссия' },
      { id: 'audience', title: 'Аудитория' },
      { id: 'voice', title: 'Голос' },
      { id: 'dictionary', title: 'Словарь' },
      { id: 'examples', title: 'Примеры коммуникации' },
    ],
  },
  {
    id: 'logo',
    title: 'Логотип',
    children: [
      { id: 'placement', title: 'Размещение на продукте' },
      { id: 'clearspace', title: 'Свободное пространство и размер' },
      { id: 'logo-color', title: 'Цвет логотипа' },
      { id: 'misuse', title: 'Ограничения' },
      { id: 'icons', title: 'Логотип на иконках' },
      { id: 'cobranding', title: 'Кобрендинг' },
    ],
  },
  { id: 'typography', title: 'Типографика', children: [{ id: 'type-styles', title: 'Стили и иерархия' }] },
  { id: 'lettering', title: 'Леттеринг моделей' },
  { id: 'made-in-moscow', title: 'Марка «Сделано в Москве»' },
  {
    id: 'key-visual',
    title: 'Ключевой образ',
    children: [
      { id: 'kv-umo5', title: 'UMO 5' },
      { id: 'kv-umo8', title: 'UMO 8' },
    ],
  },
]

const ALL_IDS = NAV.flatMap(c => [c.id, ...(c.children ?? []).map(s => s.id)])

/** Id of the lowest section heading that has scrolled past the upper third of the viewport. */
function useActiveSection() {
  const [active, setActive] = useState<string>('')
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const line = window.innerHeight / 3
      let current = ''
      let currentTop = -Infinity
      for (const id of ALL_IDS) {
        const top = document.getElementById(id)?.getBoundingClientRect().top
        // Strict ">" so that side-by-side headings (Видение / Миссия) resolve to the first one.
        if (top !== undefined && top <= line && top > currentTop) { current = id; currentTop = top }
      }
      setActive(current)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])
  return active
}

// ─── Navigation ──────────────────────────────────────────────────────────────

function NavLink({ id, title, active, onNavigate }: { id: string; title: string; active: boolean; onNavigate?: () => void }) {
  return (
    <a
      href={`#${id}`}
      onClick={onNavigate}
      className={`relative block leading-[1.25] transition-opacity hover:opacity-60 ${active ? 'font-medium' : ''}`}
    >
      {active && <span aria-hidden className="absolute -left-[0.9em]">•</span>}
      {title}
    </a>
  )
}

function Nav({ active, onNavigate }: { active: string; onNavigate?: () => void }) {
  const chapterOf = (id: string) => NAV.find(c => c.id === id || c.children?.some(s => s.id === id))?.id
  const activeChapter = chapterOf(active)
  return (
    <nav className="flex flex-col gap-4 text-[16px] tracking-[-0.01em]">
      <p className="leading-[1.25]">Стандарты бренда 2026</p>
      {NAV.map(chapter => (
        <div key={chapter.id} className="flex flex-col gap-2">
          <NavLink id={chapter.id} title={chapter.title} active={activeChapter === chapter.id} onNavigate={onNavigate} />
          {chapter.children && (
            <div className="flex flex-col gap-3 pl-6">
              {chapter.children.map(s => (
                <NavLink key={s.id} id={s.id} title={s.title} active={active === s.id} onNavigate={onNavigate} />
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  )
}

function Logo() {
  return <img src={logo} alt="UMO" width={120} height={24} className="block h-6 w-[120px]" />
}

// ─── Typography ──────────────────────────────────────────────────────────────

function H1({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 lg:scroll-mt-6 max-w-[600px] text-[32px] md:text-[48px] font-medium leading-none tracking-[-0.01em]">
      {children}
    </h2>
  )
}

function H2({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3 id={id} className="scroll-mt-24 lg:scroll-mt-6 text-[24px] md:text-[32px] font-medium leading-none tracking-[-0.01em]">
      {children}
    </h3>
  )
}

function Text({ narrow, children }: { narrow?: boolean; children: ReactNode }) {
  return (
    <div className={`${narrow ? 'max-w-[432px]' : 'max-w-[600px]'} flex flex-col gap-3 text-[18px] md:text-[20px] leading-[1.25] tracking-[-0.01em]`}>
      {children}
    </div>
  )
}

function Caption({ children, cross }: { children: ReactNode; cross?: boolean }) {
  return (
    <figcaption className="flex items-start gap-2 text-[14px] leading-[1.43] [font-feature-settings:'case'_1]">
      <span className="flex-1">{children}</span>
      {cross && <span aria-label="нельзя" className="w-4 text-center text-[20px] leading-[1.13] text-[#e30]">×</span>}
    </figcaption>
  )
}

/** One exported Figma frame. `w`/`h` are the frame's 1x size in the 1440px layout and set the aspect ratio. */
function Fig({ name, w, h, alt = '', eager, caption, cross, className = '' }: {
  name: string; w: number; h: number; alt?: string; eager?: boolean; caption?: ReactNode; cross?: boolean; className?: string
}) {
  return (
    <figure className={`flex flex-col gap-3 ${className}`}>
      <img
        src={img(name)}
        alt={alt}
        width={w * 2}
        height={h * 2}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="block h-auto w-full bg-[#f5f5f5]"
        style={{ aspectRatio: `${w} / ${h}` }}
      />
      {caption && <Caption cross={cross}>{caption}</Caption>}
    </figure>
  )
}

/** A heading + text group. Sections are separated by 144px, chapters get an extra 72px on top. */
function Section({ chapter, children }: { chapter?: boolean; children: ReactNode }) {
  return <section className={`flex flex-col gap-8 md:gap-12 ${chapter ? 'pt-12 md:pt-[72px]' : ''}`}>{children}</section>
}

function Head({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-6">{children}</div>
}

// ─── Content ─────────────────────────────────────────────────────────────────

const DICTIONARY: { good: ReactNode; bad: ReactNode; why: string }[] = [
  {
    good: <>UMO<br /><span className="font-normal">только латиницей и капителью</span></>,
    bad: 'Умка, Умочка, UMOпомрачительно',
    why: 'Игры и каламбуры с названием запрещены. Слово «Умка» может быть в сленге сообщества владельцев, но никогда в рекламных материалах или у блогеров',
  },
  { good: 'Технологичный', bad: 'Инновационный, революционный', why: 'Мы избегаем затертых маркетинговых штампов, лишенных конкретного смысла' },
  { good: 'Рациональный, честный', bad: 'Доступный, бюджетный', why: 'Слово «доступный» часто считывается как «дешевый», что искажает суть нашего технологического премиума' },
  { good: 'Электромобиль, электрокар, гибрид, кроссовер', bad: 'Тачка, машинка, электричка', why: 'Придерживаемся грамотной терминологии, не допускаем панибратства' },
  { good: 'Выразительный взгляд, удобная посадка', bad: 'Агрессивный дизайн, лаконичные линии, хищный оскал', why: 'Избегаем профессиональные штампы и устоявшиеся клише' },
  { good: 'Заголовки без точек в конце, точки в конце предложений', bad: 'Заголовки с точкой, нет знаков препинания, эмодзи в тексте', why: 'Пунктуация и оформление текстовых стилей по правилам русского языка' },
]

const EXAMPLES: [string, ReactNode][] = [
  ['Умный', 'Оснащён технологиями Яндекса'],
  ['Просторный', 'Найдётся место для всего на свете'],
  ['Тихий', 'Не создает шума на дорогах'],
  ['Проще — говоря', 'Управляйте голосом с помощью Алисы'],
  ['Запоминающиеся фары', <>Светодиодная оптика даёт яркий ровный свет<br className="hidden lg:inline" /> и не слепит встречных водителей</>],
  ['Удобная посадка', 'Угол раскрытия дверей на 90° обеспечивает лёгкую посадку даже с крупным багажом в руках'],
]

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

function Dictionary() {
  const head = 'text-[18px] md:text-[20px] leading-[1.25] tracking-[-0.01em]'
  return (
    <div className={head}>
      <div className="hidden md:grid grid-cols-[1fr_1fr_2fr] gap-x-6 py-6 font-medium">
        <p>Стандарт бренда ✓</p>
        <p>Ошибка ✗</p>
        <p>Мотивация</p>
      </div>
      {DICTIONARY.map((row, i) => (
        <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_2fr] gap-x-6 gap-y-2 border-t border-[#e6e6e6] py-6">
          <p className="font-medium"><span className="md:hidden">✓ </span>{row.good}</p>
          <p><span className="md:hidden">✗ </span>{row.bad}</p>
          <p className="text-black/60 md:text-black">{row.why}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Guide() {
  const active = useActiveSection()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const prev = document.title
    document.title = 'UMO — стандарты бренда 2026'
    // The page is lazy-loaded, so the browser's own jump to #hash on load finds nothing yet.
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (id) document.getElementById(id)?.scrollIntoView()
    return () => { document.title = prev }
  }, [])

  return (
    <div className="min-h-screen bg-white font-sans text-black lg:flex lg:items-start">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block sticky top-0 h-screen w-[320px] xl:w-[480px] shrink-0 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white p-6"><a href="#top" aria-label="В начало"><Logo /></a></div>
        <div className="px-6 pb-6"><Nav active={active} /></div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-20 bg-white">
        <div className="flex items-center justify-between px-4 py-4">
          <a href="#top" aria-label="В начало"><Logo /></a>
          <button
            type="button"
            onClick={() => setMenuOpen(o => !o)}
            aria-expanded={menuOpen}
            className="text-[16px] font-medium tracking-[-0.01em] cursor-pointer"
          >
            {menuOpen ? 'Закрыть' : 'Содержание'}
          </button>
        </div>
        {menuOpen && (
          <div className="max-h-[calc(100dvh-56px)] overflow-y-auto border-t border-[#e6e6e6] px-4 py-6">
            <Nav active={active} onNavigate={() => setMenuOpen(false)} />
          </div>
        )}
      </header>

      <main id="top" className="min-w-0 flex-1 p-4 md:p-6">
        <div className="flex max-w-[1200px] flex-col gap-24 md:gap-36">
          {/* Intro */}
          <section className="flex flex-col gap-8 md:gap-12">
            <Fig name="hero" w={912} h={456} eager alt="Семья у UMO 8 в лесу" />
            <p className="text-[32px] md:text-[48px] font-medium leading-none tracking-[-0.01em]">
              UMO — это автомобильный бренд, созданный в технологическом партнёрстве с Яндексом
            </p>
          </section>

          {/* ── Позиционирование ── */}
          <Section chapter>
            <Fig name="positioning" w={912} h={456} alt="" />
            <Head>
              <H1 id="positioning">Позиционирование</H1>
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
                <Text narrow><p>Сделать электромобильность новой, доступной и естественной нормой жизни для миллионов людей уже сегодня.</p></Text>
              </Head>
              <Head>
                <H2 id="mission">Миссия</H2>
                <Text narrow><p>Через умный транспорт трансформировать культуру повседневных поездок.</p></Text>
              </Head>
            </div>
            <Fig name="vision" w={912} h={456} />
          </Section>

          <Section>
            <Head>
              <H2 id="audience">Аудитория</H2>
              <Text narrow><p>Современные люди, лояльные к технологиям — им важны персонализация и комфорт, а не статус ради статуса.</p></Text>
            </Head>
            <Fig name="audience" w={912} h={456} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
              <Head>
                <p className="text-[24px] font-medium leading-none tracking-[-0.01em]">UMO 5</p>
                <Text narrow><p>Молодые городские — те, кто живёт в ритме и выбирает машину под свою мобильность здесь и сейчас.</p></Text>
              </Head>
              <Head>
                <p className="text-[24px] font-medium leading-none tracking-[-0.01em]">UMO 8</p>
                <Text narrow><p>Семейный и представительский сегмент — те, для кого машина должна одинаково подходить и для путешествия с детьми, и для деловой поездки.</p></Text>
              </Head>
            </div>
          </Section>

          <Section>
            <Head>
              <H2 id="voice">Голос</H2>
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
            <Dictionary />
          </Section>

          <Section>
            <Head>
              <H2 id="examples">Примеры коммуникации</H2>
              <Text narrow><p>Лучше один раз увидеть: UMO говорит по-человечески и уважительно на вы.</p></Text>
            </Head>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 text-[18px] md:text-[20px] leading-[1.25] tracking-[-0.01em]">
              {EXAMPLES.map(([title, text]) => (
                <div key={title} className="flex flex-col gap-3 border-t border-[#e6e6e6] py-6">
                  <p className="font-medium">{title}</p>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Логотип ── */}
          <Section chapter>
            <Head>
              <H1 id="logo">Логотип</H1>
              <Text>
                <p>Логотип UMO не буквы, а модули.</p>
                <p>Словесный знак собран из элементов, как из конструктора — чистая геометрия и инженерия. Это визуальный эквивалент главной идеи бренда — город как система, а автомобиль как её умный, технологичный элемент.</p>
              </Text>
            </Head>
            <Fig name="logo" w={912} h={456} alt="Логотип UMO" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Fig name="placement-exterior" w={912} h={456} className="md:col-span-2" alt="Логотип на передней части UMO 8" />
              <Fig name="placement-interior" w={444} h={333} alt="Логотип на руле" />
              <Fig name="placement-badge" w={444} h={333} alt="Шильдик UMO на кузове" />
            </div>
          </Section>

          <Section>
            <Head>
              <H2 id="clearspace">Свободное пространство и размер</H2>
              <Text>
                <p>Минимальный размер свободного пространства равен одной базовой единице: высоте логотипа (U). В пределах свободного пространства нельзя размещать другие элементы.</p>
                <p>Чтобы сохранить узнаваемость и четкость не уменьшайте размеры логотипа ниже рекомендуемых.</p>
              </Text>
            </Head>
            <div className="flex flex-col gap-6">
              <Fig name="clearspace" w={912} h={456} alt="Схема охранного поля логотипа: U со всех сторон" />
              <Fig name="minsize" w={912} h={304} alt="Минимальный размер: аналоговый ≥20 мм, цифровой ≥40 px" />
            </div>
          </Section>

          <Section>
            <Head>
              <H2 id="logo-color">Цвет логотипа</H2>
              <Text narrow><p>Цвет логотипа подбирается по контрасту, яркости и тону фона: белый или черный.</p></Text>
            </Head>
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Fig name="color-white" w={444} h={333} caption="Белый для тёмного фона" alt="Белый логотип на чёрном" />
                <Fig name="color-black" w={444} h={333} caption="Чёрный для светлого фона" alt="Чёрный логотип на светлом" />
              </div>
              <figure className="flex flex-col gap-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {['color-photo', 'color-red', 'color-yellow', 'color-light'].map(n => (
                    <img key={n} src={img(n)} alt="" width={420} height={560} loading="lazy" decoding="async" className="block h-auto w-full" style={{ aspectRatio: '210 / 280' }} />
                  ))}
                </div>
                <Caption>Примеры подбора цвета</Caption>
              </figure>
            </div>
          </Section>

          <Section>
            <Head>
              <H2 id="misuse">Ограничения</H2>
              <Text><p>Необходимо сохранять оригинальные пропорции и дизайн логотипа, чтобы избежать потери узнаваемости и искажений восприятия.</p></Text>
            </Head>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-6">
              {MISUSE.map(([name, text]) => (
                <Fig key={name} name={name} w={288} h={216} caption={text} cross alt={text} />
              ))}
            </div>
          </Section>

          <Section>
            <Head>
              <H2 id="icons">Логотип на иконках</H2>
              <Text>
                <p>Размещая логотип на мелких форматах рекомендуется учитывать минимальные размеры и свободное пространство.</p>
                <p>Иконка сайта — исключение.</p>
              </Text>
            </Head>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Fig name="icon-app" w={444} h={333} caption="Иконка мобильного приложения" />
              <Fig name="icon-userpic" w={444} h={333} caption="Юзерпик аккаунта соцсетей" />
              <Fig name="icon-favicon" w={444} h={333} caption="Фавиконка и иконка закладок в браузере" />
              <Fig name="icon-post" w={444} h={333} caption="Пост в соцсети" />
            </div>
          </Section>

          <Section>
            <Head>
              <H2 id="cobranding">Кобрендинг</H2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                <Text narrow>
                  <p>Для совместного брендинга с логотипом UMO используйте квадратный или горизонтальный логотип (словесный знак) другой компании.</p>
                  <p>Следите за размерами логотипов, их расположением и правилами свободного пространства.</p>
                </Text>
                <Text narrow>
                  <p>Высота разделительной линии между логотипами равна высоте логотипа UMO, ширина 1/30 высоты.</p>
                  <p>Любой кобрендинг требует одобрения от команды бренда и юридической команды.</p>
                </Text>
              </div>
            </Head>
            <div className="flex flex-col gap-6">
              <Fig name="cobrand-square" w={912} h={304} alt="Схема кобрендинга с квадратным логотипом" />
              <Fig name="cobrand-square-example" w={912} h={304} alt="UMO и Яндекс" />
            </div>
            <div className="flex flex-col gap-6">
              <Fig name="cobrand-horizontal" w={912} h={304} alt="Схема кобрендинга с горизонтальным логотипом" />
              <Fig name="cobrand-horizontal-example" w={912} h={304} alt="UMO и EVM" />
            </div>
          </Section>

          {/* ── Типографика ── */}
          <Section chapter>
            <Head>
              <H1 id="typography">Типографика</H1>
              <Text>
                <p>Гарнитура CoFo Sans — основа визуальной идентификации и стиля бренда UMO. Функциональный и разборчивый, он имеет несколько весов для полной свободы выражения.</p>
                <p>Когда использование CoFo Sans невозможно, допускается применение альтернатив, доступных в популярных рабочих пространствах.</p>
              </Text>
            </Head>
            <div className="flex flex-col gap-6">
              <figure className="flex flex-col gap-3">
                <div className="flex aspect-[2/1] items-center justify-center bg-[#f5f5f5]">
                  <p className="text-[48px] sm:text-[72px] md:text-[96px] font-medium leading-none tracking-[-0.01em]">CoFo Sans</p>
                </div>
                <Caption>Базовая гарнитура</Caption>
              </figure>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Fig name="font-geist" w={288} h={216} caption="Альтернатива для Google" alt="Geist" />
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

          {/* ── Леттеринг ── */}
          <Section chapter>
            <H1 id="lettering">Леттеринг моделей</H1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Fig name="lettering-vector" w={444} h={333} alt="Леттеринг MODEL 8 и MODEL 5" />
              <Fig name="lettering-umo8" w={444} h={333} alt="Леттеринг на корме UMO 8" />
              <Fig name="lettering-umo5" w={444} h={333} alt="Леттеринг на кузове UMO 5" />
              <Fig name="lettering-plates" w={444} h={333} alt="Шильдики MODEL 8 и MODEL 5" />
            </div>
          </Section>

          {/* ── Сделано в Москве ── */}
          <Section chapter>
            <H1 id="made-in-moscow">Марка «Сделано в Москве»</H1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Fig name="moscow-umo5" w={444} h={368} alt="Шильдик «Сделано в Москве» на UMO 5" />
              <Fig name="moscow-umo8" w={444} h={368} alt="Шильдик «Сделано в Москве» на UMO 8" />
            </div>
          </Section>

          {/* ── Ключевой образ ── */}
          <Section chapter>
            <Fig name="keyvisual" w={912} h={456} />
            <Head>
              <H1 id="key-visual">Ключевой образ</H1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                <Text><p>Без излишней постановочности и драмы. Изображение захватывает взгляд, потому что все, что видит зритель, происходит здесь и сейчас.</p></Text>
                <Text><p>Автомобили становятся частью мира аудитории, но показаны в выгодном ракурсе, который подчеркивает преимущества или рассказывает историю за счет окружения.</p></Text>
              </div>
            </Head>
          </Section>

          <Section>
            <Head>
              <H2 id="kv-umo5">UMO 5</H2>
              <Text narrow><p>Ключевой образ и рекламные материалы для UMO Model 5</p></Text>
            </Head>
            <div className="flex flex-col gap-6">
              <Fig name="umo5-kv" w={912} h={456} alt="Ключевой образ UMO 5" />
              <div className="grid grid-cols-1 sm:grid-cols-[600fr_288fr] gap-6">
                <Fig name="umo5-banner" w={600} h={368} alt="Горизонтальный баннер UMO 5" />
                <Fig name="umo5-square" w={288} h={368} alt="Вертикальный баннер UMO 5" />
              </div>
            </div>
          </Section>

          <Section>
            <Head>
              <H2 id="kv-umo8">UMO 8</H2>
              <Text narrow><p>Ключевой образ и рекламные материалы для UMO Model 8</p></Text>
            </Head>
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-[288fr_600fr] gap-6">
                <Fig name="umo8-square" w={288} h={368} alt="Вертикальный баннер UMO 8" className="order-2 sm:order-none" />
                <Fig name="umo8-banner" w={600} h={368} alt="Горизонтальный баннер UMO 8" />
              </div>
              <Fig name="umo8-kv" w={912} h={456} alt="Ключевой образ UMO 8" />
            </div>
          </Section>

          <footer className="text-[16px] leading-[1.25] tracking-[-0.01em] text-[#999]">ООО «ЭМ РУС». 0+</footer>
        </div>
      </main>
    </div>
  )
}
