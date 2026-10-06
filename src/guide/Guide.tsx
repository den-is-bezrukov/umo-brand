import { isValidElement, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import PriceCard from '@/posters/PriceCard'
import type { Variant } from '@/posters/cardData'
import UmoLogo from './UmoLogo'
import UmoYandexLockup from './UmoYandexLockup'
import PlateArt from '@/plate/PlateArt'
import { BASELINE as STRIP_BASELINE } from '@/plate/frame'
import tocIcons from '@/icons/toc'
import { useTypograf } from './typograf'
import downloadSizes from 'virtual:download-sizes'
import heroMp4 from '@/assets/guide/hero.mp4'
import hero720Mp4 from '@/assets/guide/hero-720.mp4'

// Figures are exported from Figma (UMO | Evrone, node 4810:686) at 2x and
// cropped per frame — see "Brand guide" in AGENTS.md for how to refresh them.
// Vector schemes (clear space, co-branding, type specimens, lettering) are SVG, photos are WebP.
const images = import.meta.glob<string>('../assets/guide/*.{webp,svg}', { eager: true, import: 'default' })
const img = (name: string) => images[`../assets/guide/${name}.svg`] ?? images[`../assets/guide/${name}.webp`]

type NavItem = { id: string; title: string; children?: NavItem[] }

/**
 * The media of Носители, in the order of the sections they stood in. A wide picture (2:1 and wider) takes a whole row of
 * the overview grid, narrow ones pair up, and a narrow one moves up next to an unpaired one before it (what CSS
 * `grid-auto-flow: dense` would do). `MEDIA` is that packed order, so the grid and the sidebar's sub-items list the
 * media as they actually stand.
 */
const MEDIA_LIST: { id: string; to: string; title: string; w: number; h: number; picture: ReactNode }[] = [
  { id: 'livery', to: '/livery', title: 'Ливрея', w: 912, h: 456, picture: <Fig name="livery-umo5" flat="#f6f6f6" w={912} h={456} alt="UMO 5 с ливреей дилера" /> },
  {
    id: 'price-card', to: '/price-card', title: 'Прайс-карта', w: 444, h: 444,
    picture: (
      <div className="flex aspect-square items-center justify-center bg-[#f5f5f5]">
        <div className="w-[57%]">
          <PriceCardPreview variant="umo5-max" fullPrice="3 715 000" creditPrice="2 790 000" image={img('pricecard-umo5-car')} alt="Прайс-карта UMO 5" />
        </div>
      </div>
    ),
  },
  {
    id: 'plate-frame', to: '/plate-frame', title: 'Рамка номера', w: 912, h: 304,
    picture: (
      <div className="flex aspect-4/3 items-center justify-center overflow-hidden bg-[#f5f5f5] md:block md:aspect-auto">
      <PlateArt guide className="w-[130%]! max-w-none shrink-0 md:w-full!">
        <text y={STRIP_BASELINE} fontFamily="CoFo Sans" fontWeight={500} fontSize={18} letterSpacing={-0.18} fill="white" style={{ fontFeatureSettings: "'case' 1" }}>Центр UMO | Название дилера</text>
      </PlateArt>
    </div>
    ),
  },
  { id: 'name-tag', to: '/name-tag', title: 'Бейдж', w: 444, h: 444, picture: <Fig name="name-tag-square" w={444} h={444} alt="Бейдж UMO на рубашке сотрудника" /> },

]
const isWide = (m: { w: number; h: number }) => m.w / m.h >= 2
function packMedia<T extends { w: number; h: number }>(items: T[]): T[] {
  const packed: T[] = []
  let unpaired = -1
  for (const m of items) {
    if (isWide(m)) packed.push(m)
    else if (unpaired === -1) unpaired = packed.push(m) - 1
    else { packed.splice(unpaired + 1, 0, m); unpaired = -1 }
  }
  return packed
}
const MEDIA = packMedia(MEDIA_LIST)

const NAV: NavItem[] = [
  {
    id: 'brand',
    title: 'Платформа бренда',
    children: [
      { id: 'positioning', title: 'Позиционирование' },
      { id: 'vision', title: 'Видение' },
      { id: 'mission', title: 'Миссия' },
      { id: 'audience', title: 'Аудитория' },
      { id: 'voice', title: 'Голос' },
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
  {
    id: 'key-visual',
    title: 'Ключевой образ',
    children: [
      { id: 'photography', title: 'Фотография' },
      { id: 'kv-umo5', title: 'UMO 5' },
      { id: 'kv-umo8', title: 'UMO 8' },
    ],
  },
  { id: 'spaces', title: 'Пространства' },
  { id: 'materials', title: 'Носители', children: MEDIA.map(({ id, title }) => ({ id, title })) },
]

/** Chapter anchors that were renamed after the guide went out, mapped to their current ids. */
const OLD_ANCHORS: Record<string, string> = {
  dealer: 'spaces', retail: 'spaces', print: 'materials', fonts: 'typography', about: 'brand', intro: 'top',
}

const flatItems = (items: NavItem[]): NavItem[] => items.flatMap(i => [i, ...flatItems(i.children ?? [])])
const ALL_IDS = flatItems(NAV).map(i => i.id)
const TITLES: Record<string, string> = Object.fromEntries(flatItems(NAV).map(i => [i.id, i.title]))
/** Whether `id` is this item or anything nested under it. */
const contains = (item: NavItem, id: string): boolean => item.id === id || !!item.children?.some(c => contains(c, id))

/**
 * Ids of the lowest section heading that has scrolled past the upper third of the viewport — several when headings
 * stand side by side on one line (Видение / Миссия), so every one you can see next to it is lit.
 */
function useActiveSection() {
  const [active, setActive] = useState<string[]>([])
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const line = window.innerHeight / 3
      let current: string[] = []
      let currentTop = -Infinity
      for (const id of ALL_IDS) {
        const top = document.getElementById(id)?.getBoundingClientRect().top
        if (top === undefined || top > line) continue
        if (Math.abs(top - currentTop) < 1) current.push(id)
        else if (top > currentTop) { current = [id]; currentTop = top }
      }
      setActive(prev => (prev.join() === current.join() ? prev : current))
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

/**
 * The contents' links turn grey (#808080) at once and fade back to black over 0.35s once the pointer leaves, like
 * guides.area17.com (a transition runs with the duration of the state it heads to). The active one stays black.
 */
const NAV_HOVER = 'transition-[color] duration-350 ease-[ease] hover:text-[#808080] hover:duration-0'

/**
 * Links in the page (the quick links, download rows and captions) stay black and get a hairline underline as set in
 * Figma (4865:1061): black at 40%, 2.5% of the type size thick, 25% of it under the baseline, through the descenders.
 * It shows at once and fades over 0.25s: it's always there, transparent until hovered. `UNDERLINE` is the line;
 * `LINK_HOVER` shows it on the link's own hover, rows show it on the row's (`group-hover`).
 */
const UNDERLINE = 'underline decoration-transparent decoration-[2.5%] underline-offset-[25%] [text-decoration-skip-ink:none] transition-[text-decoration-color] duration-250 ease-[ease]'
const LINK_HOVER = `${UNDERLINE} hover:decoration-black/40 hover:duration-0`
/** A link inside body copy keeps that line at 40% so it reads as a link, and it turns black under the pointer */
const TEXT_LINK = 'underline decoration-black/40 decoration-[2.5%] underline-offset-[25%] [text-decoration-skip-ink:none] transition-[text-decoration-color] duration-250 ease-[ease] hover:decoration-black hover:duration-0'

/**
 * `active`: you're inside this item (medium weight); `current`: its own heading is the one on screen (the bullet).
 * The space between items is the links' own padding (`pad`), not gaps, so the whole list is clickable (Figma 4865:1031).
 */
function NavLink({ id, title, active, current, onNavigate, pad }: { id: string; title: string; active: boolean; current: boolean; onNavigate?: () => void; pad: string }) {
  return (
    <a
      href={`#${id}`}
      onClick={onNavigate}
      aria-current={active ? 'location' : undefined}
      className={`relative block leading-[1.25] ${pad} ${active ? 'font-medium' : NAV_HOVER}`}
    >
      {current && <span aria-hidden className="absolute -left-[0.9em]">•</span>}
      {title}
    </a>
  )
}

/** Table-of-contents icon, 16×16 on a 20px line: the menu bars to open the contents, the cross to fold them. */
function TocIcon({ name }: { name: keyof typeof tocIcons }) {
  return (
    <span aria-hidden className="flex h-5 shrink-0 items-center">
      <svg width="16" height="16" viewBox="0 0 16 16" className="block">
        <path d={tocIcons[name]} fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    </span>
  )
}

/** Expand-all row at the foot of the table of contents: the menu bars to spread the list, the cross to fold it. */
function TocToggle({ expanded, onClick, className = '' }: { expanded: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      // No width of its own: both places set it, and a `w-full` here outranked theirs in the built CSS
      className={`flex cursor-pointer items-start gap-2 bg-white ${NAV_HOVER} text-left text-[16px] font-medium leading-[1.25] tracking-[-0.01em] ${className}`}
    >
      <TocIcon name={expanded ? 'close' : 'menu'} />
      {expanded ? 'Свернуть' : 'Содержание'}
    </button>
  )
}

function Nav({ active, expandAll, onNavigate }: { active: string[]; expandAll: boolean; onNavigate?: () => void }) {
  const activeChapter = NAV.find(c => active.some(id => contains(c, id)))?.id
  return (
    // Chapters 8px above and under (16px apart), items 4px (8px apart): chapter → first item 12px; the last item takes
    // 8px under it, so it's 16px to the next chapter, and so does an item over its own nested items (12px to them).
    // The first and last chapters' 8px go under what's above and below the list (-my-2), so the text stays put.
    <nav className="-my-2 flex flex-col text-[16px] tracking-[-0.01em]">
      {NAV.map(chapter => {
        // Like guides.area17.com: only the chapter you're reading is open, unless everything is expanded.
        const open = expandAll || activeChapter === chapter.id
        return (
          <div key={chapter.id} className="flex flex-col">
            <NavLink id={chapter.id} title={chapter.title} active={activeChapter === chapter.id} current={active.includes(chapter.id)} onNavigate={onNavigate} pad="py-2" />
            {chapter.children && (
              <div
                inert={!open}
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="flex flex-col pl-6">
                    {chapter.children.map(s => (
                      <div key={s.id} className="group/item flex flex-col">
                        <NavLink id={s.id} title={s.title} active={active.some(id => contains(s, id))} current={active.includes(s.id)} onNavigate={onNavigate} pad={s.children ? 'pt-1 pb-2' : 'py-1 group-last/item:pb-2'} />
                        {s.children && (
                          <div className="flex flex-col pl-6">
                            {s.children.map(t => (
                              <NavLink key={t.id} id={t.id} title={t.title} active={active.includes(t.id)} current={active.includes(t.id)} onNavigate={onNavigate} pad="py-1" />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

/**
 * Keeps the item you're reading visible in the desktop sidebar when the list is taller than the screen (expanded):
 * once the page settles, the sidebar scrolls just enough to show it between the sticky logo and the toggle row.
 */
function useActiveInView(asideRef: RefObject<HTMLElement | null>, active: string[], expandAll: boolean) {
  useEffect(() => {
    const aside = asideRef.current
    if (!aside || !active.length) return
    // Wait out a chapter opening or closing (0.3s), and fast scrolling through several headings.
    const timer = setTimeout(() => {
      const lit = aside.querySelectorAll('nav [aria-current]')
      const link = lit[lit.length - 1]
      if (!link) return
      const head = aside.firstElementChild as HTMLElement
      const foot = aside.lastElementChild as HTMLElement
      const box = aside.getBoundingClientRect()
      const r = link.getBoundingClientRect()
      const top = box.top + head.offsetHeight
      // Below the hero photo the sidebar runs off the screen, and the toggle row rides at the screen's bottom.
      const bottom = Math.min(box.bottom, window.innerHeight) - foot.offsetHeight
      const by = r.top < top ? r.top - top - 24 : r.bottom > bottom ? r.bottom - bottom + 24 : 0
      if (by) aside.scrollBy({ top: by, behavior: 'smooth' })
    }, 350)
    return () => clearTimeout(timer)
  }, [asideRef, active, expandAll])
}

/**
 * While the page slides up over the hero, the sidebar's toggle row stays fixed at the bottom of the screen, while the
 * sidebar runs off it, so the contents unroll between the logo and the row as the page rises. They fade in over the
 * first 160px of scroll: on the first screen there's only the logo and the row. The logo, 200px wide on the first
 * screen, shrinks with the scroll to its usual 120 (24 high) by the time the page reaches the top.
 */
function useHeroReveal(bodyRef: RefObject<HTMLElement | null>, asideRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const body = bodyRef.current
      const aside = asideRef.current
      if (!body || !aside) return
      const lift = Math.max(0, body.getBoundingClientRect().top)
      const logo = aside.querySelector<HTMLElement>('[data-logo]')
      // The page starts at its own offset from the top (a strip above the bottom of the screen) — that's how far it rises.
      if (logo) logo.style.width = `${120 + 80 * Math.min(1, lift / Math.max(1, body.offsetTop))}px`
      const nav = aside.querySelector('nav')
      if (nav) {
        const opacity = Math.min(1, window.scrollY / 160)
        nav.style.opacity = String(opacity)
        nav.style.visibility = opacity ? '' : 'hidden'
      }
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
  }, [bodyRef, asideRef])
}

/**
 * Height of the first screen's white strip (`--strip` on the page), from lg. The statement's capitals stand level with
 * the top of the logo (the body's 16px on top plus CoFo Sans's 0.164em above the caps at leading 1 make the logo's 24),
 * and the quick links under it share a line with the toggle row at the bottom of the screen (the row's 20px line starts
 * 24px into its 68), however many lines the statement wraps to (Figma 4893:3846).
 */
function useHeroStrip(pageRef: RefObject<HTMLElement | null>, quickRef: RefObject<HTMLElement | null>, bodyRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const page = pageRef.current
    const quick = quickRef.current
    const block = quick?.parentElement
    const body = bodyRef.current
    if (!page || !quick || !block || !body) return
    let frame = 0
    const update = () => {
      frame = 0
      // Below lg: how far the quick links end under the top of the page (header and statement included), for the film
      // to take the rest of the first screen (see Hero).
      page.style.setProperty('--mstrip', `${Math.round(quick.getBoundingClientRect().bottom - body.getBoundingClientRect().top)}px`)
      const strip = `${Math.round(16 + quick.offsetTop - block.offsetTop + 68 - 24)}px`
      if (page.style.getPropertyValue('--strip') === strip) return
      page.style.setProperty('--strip', strip)
      // The page now starts elsewhere: let useHeroReveal place the toggle row and size the logo anew.
      window.dispatchEvent(new Event('resize'))
    }
    // A frame later, out of the observer's own pass, so moving the page doesn't loop it.
    const observer = new ResizeObserver(() => { if (!frame) frame = requestAnimationFrame(update) })
    observer.observe(block)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [pageRef, quickRef, bodyRef])
}

/**
 * The hero: the UMO test-drive film, looped and muted — the source MP4s as they came (H.264, no re-encoding: they're
 * already set up for the web); the poster is their first frame, so nothing jumps when it starts. The 1080p film (12 MB)
 * by default, the 720p one (6.2 MB) on a slow connection: at once where the browser tells the speed (Chrome, Edge,
 * Android: 3G or slower), and in any browser when the 1080p hasn't buffered enough to play within
 * 3 seconds. It plays only while some
 * of it is on screen: once the page has slid over it whole, it stops, and goes on from that frame when it shows again.
 * With reduced motion asked for, or data saving on, the still photo stands in.
 * Below lg it heads the page and takes what the first screen has left above the header, statement and quick links
 * (`--mstrip`) and the bottom bar with a gap over it (52 + 16, from md 68 + 24), so the guide's first section starts
 * below the fold; never less than half the screen's width, as on a phone held sideways.
 */
function Hero({ bodyRef }: { bodyRef: RefObject<HTMLElement | null> }) {
  const ref = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [still] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData)
  const [src, setSrc] = useState(() => {
    // The connection type only: Chrome's `downlink` is guessed from the first few requests and reads far too low then
    const type = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType ?? ''
    return ['slow-2g', '2g', '3g'].includes(type) ? hero720Mp4 : heroMp4
  })
  // Still not enough buffered to play after 3 s: the lighter film instead
  useEffect(() => {
    if (still || src !== heroMp4) return
    const t = setTimeout(() => {
      const video = videoRef.current
      if (video && video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) setSrc(hero720Mp4)
    }, 3000)
    return () => clearTimeout(t)
  }, [still, src])
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    // React doesn't put `muted` on the element as an attribute, and browsers only autoplay muted video.
    video.muted = true
    let frame = 0
    const update = () => {
      frame = 0
      const box = ref.current?.getBoundingClientRect()
      if (!box) return
      // From lg the page slides over the fixed film; on a phone the film scrolls away above the page.
      const below = bodyRef.current?.getBoundingClientRect().top ?? Infinity
      const seen = Math.min(box.bottom, below) - Math.max(box.top, 0) > 0
      if (seen && video.paused) video.play().catch(() => { /* autoplay refused: the poster stays */ })
      else if (!seen && !video.paused) video.pause()
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
  }, [bodyRef])
  const fill = 'block size-full bg-black object-cover'
  return (
    <div ref={ref} className="relative z-30 h-[max(50vw,calc(100svh-var(--mstrip,260px)-68px))] md:h-[max(50vw,calc(100svh-var(--mstrip,360px)-92px))] lg:fixed lg:inset-x-0 lg:top-0 lg:z-0 lg:h-[calc(100vh-var(--strip,286px))]">
      {still ? (
        <img src={img('hero')} alt="Женщина у UMO 8 на горной дороге" width={1824} height={912} fetchPriority="high" decoding="async" className={`${fill} object-[50%_40%]`} />
      ) : (
        <video ref={videoRef} src={src} poster={img('hero-poster')} autoPlay muted loop playsInline preload="auto" aria-hidden className={fill} />
      )}
    </div>
  )
}

const EXPAND_KEY = 'umo-guide-toc-expanded'

/** Remembers the expand-all choice per browser; storage may be unavailable, so every access is guarded. */
function useExpandAll() {
  const [expandAll, setExpandAll] = useState(() => {
    try { return localStorage.getItem(EXPAND_KEY) === '1' } catch { return false }
  })
  const toggle = () => setExpandAll(v => {
    try { localStorage.setItem(EXPAND_KEY, v ? '0' : '1') } catch { /* ignore */ }
    return !v
  })
  return [expandAll, toggle] as const
}

function Logo({ className = 'w-[120px]' }: { className?: string }) {
  return <UmoLogo title="UMO" className={className} />
}

/** The logo takes you to the very top, the hero photo included, and leaves no #top in the address. */
function toTop(e: MouseEvent<HTMLAnchorElement>) {
  e.preventDefault()
  history.replaceState(null, '', window.location.pathname + window.location.search)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ─── Typography ──────────────────────────────────────────────────────────────

/**
 * Chapter: the title, then the chapter's sections. The title is 8 of 12 columns wide, `full` lets it span the whole
 * grid. The anchor `id` sits on an empty marker above the title, so links land on the chapter's very start and the
 * active-chapter tracking sees it begin there.
 * `loose` puts section spacing between title and content, for chapters whose title isn't followed by body copy.
 */
function Chapter({ id, title, full, loose, children }: {
  id: string; title: ReactNode; full?: boolean; loose?: boolean; children: ReactNode
}) {
  return (
    // The page list is spaced by sections, so a chapter adds the difference on top.
    <div className="pt-[calc(var(--spacing-chapter)-var(--spacing-section))]">
      <div id={id} className="scroll-mt-24" />
      <h2 className={`${full ? '' : 'max-w-[600px]'} text-[32px] md:text-[48px] font-medium leading-none tracking-[-0.01em]`}>
        {title}
      </h2>
      <div className={`${loose ? 'mt-8 md:mt-12' : 'mt-6'} flex flex-col gap-section`}>{children}</div>
    </div>
  )
}

function H2({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3 id={id} className="scroll-mt-24 text-[24px] md:text-[32px] font-medium leading-none tracking-[-0.01em]">
      {children}
    </h3>
  )
}

/** Characters of text in a React tree. */
function textLength(node: ReactNode): number {
  if (typeof node === 'string' || typeof node === 'number') return String(node).length
  if (Array.isArray(node)) return node.reduce((n: number, c: ReactNode) => n + textLength(c), 0)
  if (isValidElement<{ children?: ReactNode }>(node)) return textLength(node.props.children)
  return 0
}

/**
 * Body copy. Its width on the 12-column Figma grid follows from how much text there is: up to 150 characters
 * (a line or two) 6 columns, up to 300 — 8, longer — 9, so short notes don't stretch thin and long copy doesn't
 * stand as a tall column. Texts paired side by side (Кобрендинг, Ключевой образ) fill their grid cells instead —
 * their grid sets `*:max-w-none`.
 */
function Text({ children }: { children: ReactNode }) {
  const n = textLength(children)
  const width = n <= 150 ? 'max-w-[432px]' : n <= 300 ? 'max-w-[600px]' : 'max-w-[678px]'
  return (
    <div className={`${width} flex flex-col gap-3 text-[18px] md:text-[20px] leading-[1.25] tracking-[-0.01em]`}>
      {children}
    </div>
  )
}

function Caption({ children, cross, download }: { children: ReactNode; cross?: boolean; download?: boolean }) {
  return (
    <figcaption className="flex items-start gap-2 text-[14px] leading-[1.43] [font-feature-settings:'case'_1]">
      {download && <span aria-hidden className="mt-[3px] w-[14px] shrink-0 border-b border-black pb-px text-center font-medium leading-none">↓</span>}
      <span className={`flex-1 ${download ? `${UNDERLINE} group-hover:decoration-black/40 group-hover:duration-0` : ''}`}>{children}</span>
      {cross && <span aria-label="нельзя" className="w-4 text-center text-[20px] leading-[1.13] text-[#e30]">×</span>}
    </figcaption>
  )
}

/** Whether a picture is a landscape photo that goes 4:3 on phones: 2:1 and wider, raster (schemes are SVG and stay whole). */
const isWidePhoto = (name: string, w: number, h: number) => w / h >= 2 && !img(name)?.endsWith('.svg')

/**
 * One exported Figma frame. `w`/`h` are the frame's 1x size in the 1440px layout and set the aspect ratio. On phones a
 * landscape photo (`isWidePhoto`) is cropped to 4:3, as a 2:1 strip 343px wide is too thin; `focus` is the crop's
 * horizontal point in % (default the centre). An object on a flat background (`flat`, that background's colour) isn't
 * cropped — it is fitted into the 4:3 frame whole, the frame filled with its colour. `href` makes the whole figure a download link, its caption led by ↓
 * like the rows of `Assets`.
 */
function Fig({ name, w, h, alt = '', eager, caption, cross, href, focus = 50, flat, className = '' }: {
  name: string; w: number; h: number; alt?: string; eager?: boolean; caption?: ReactNode; cross?: boolean; href?: string; focus?: number; flat?: string; className?: string
}) {
  const wide = isWidePhoto(name, w, h)
  const figure = (
    <figure className={`flex flex-col gap-3 ${href ? '' : className}`}>
      <img
        src={img(name)}
        alt={alt}
        width={w * 2}
        height={h * 2}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className={`block h-auto w-full bg-[#f5f5f5] ${wide ? `aspect-4/3 ${flat ? 'object-contain' : 'object-cover'} md:aspect-(--ratio)` : ''}`}
        style={wide ? ({ '--ratio': `${w} / ${h}`, objectPosition: `${focus}% 50%`, ...(flat && { background: flat }) } as CSSProperties) : { aspectRatio: `${w} / ${h}` }}
      />
      {caption && <Caption cross={cross} download={!!href}>{caption}</Caption>}
    </figure>
  )
  return href ? <a href={href} download className={`group block ${className}`}>{figure}</a> : figure
}

/**
 * Flat background with the wordmark centred on it — built from the logo SVG rather than an exported picture.
 * `w`/`h` set the aspect ratio (1x frame size in Figma), `logo` is the wordmark width in the same units.
 */
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
      <div className="absolute" style={{ ...x, bottom: u(20), width: u(104) }}>
        <UmoYandexLockup className="w-full" />
      </div>
    </figure>
  )
}

function LogoPlate({ w, h, logo, bg, dark, caption, className = '' }: {
  w: number; h: number; logo: number; bg: string; dark?: boolean; caption?: ReactNode; className?: string
}) {
  return (
    <figure className={`flex flex-col gap-3 ${className}`}>
      <div
        className={`flex items-center justify-center ${dark ? 'text-white' : 'text-black'}`}
        style={{ aspectRatio: `${w} / ${h}`, background: bg }}
      >
        <div style={{ width: `${(logo / w) * 100}%` }}>
          <UmoLogo title={`Логотип UMO, ${dark ? 'белый' : 'чёрный'}`} className="w-full" />
        </div>
      </div>
      {caption && <Caption>{caption}</Caption>}
    </figure>
  )
}

/** 210×280 colour example that still needs its photo background, exported from Figma with the logo baked in. */
function Photo({ name }: { name: string }) {
  return (
    <img src={img(name)} alt="" width={420} height={560} loading="lazy" decoding="async" className="block h-auto w-full" style={{ aspectRatio: '210 / 280' }} />
  )
}

const POSTER_W = 1754
const POSTER_H = 2480

/** A live PriceCard (the same component the constructor renders) scaled down to fit its column. */
function PriceCardPreview({ variant, fullPrice, creditPrice, image, alt }: {
  variant: Variant; fullPrice: string; creditPrice: string; image: string; alt: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / POSTER_W))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={ref} role="img" aria-label={alt} className="relative overflow-hidden bg-white" style={{ aspectRatio: `${POSTER_W} / ${POSTER_H}` }}>
      {scale > 0 && (
        <div aria-hidden className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${scale})` }}>
          <PriceCard variant={variant} fullPrice={fullPrice} creditPrice={creditPrice} image={image} />
        </div>
      )}
    </div>
  )
}

/** A file from public/downloads/ (the row shows its name and size) or a page of this site (its title and path). */
type Asset = { file: string } | { to: string; title: string }

/** Size in КБ below 1000 КБ, else МБ. */
function fileSize(bytes: number): [number, string] {
  return bytes < 1e6 ? [bytes / 1e3, 'КБ'] : [bytes / 1e6, 'МБ']
}

/**
 * Asset list: a row per file or page, a hairline above each. Up to 3 rows stay in one column, 4 and more
 * split into two, filled top to bottom so files of one item stay together. Sizes get one decimal in every
 * row as soon as one of them is under 10 (0,7 КБ), and none otherwise.
 */
function Assets({ items, preview }: { items: Asset[]; preview?: string }) {
  const sizes = items.flatMap(a => ('file' in a ? [fileSize(downloadSizes[a.file] ?? 0)] : []))
  const digits = sizes.some(([n]) => n < 10) ? 1 : 0
  const number = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  const two = items.length > 3
  return (
    <div
      className={two ? 'grid grid-cols-1 gap-x-6 sm:grid-flow-col sm:grid-cols-2 sm:grid-rows-[repeat(var(--rows),auto)]' : 'flex flex-col'}
      style={two ? ({ '--rows': Math.ceil(items.length / 2) } as CSSProperties) : undefined}
    >
      {items.map(a => {
        const row = 'group flex items-center gap-4 border-t border-[#e6e6e6] py-[14px] text-[16px] leading-none tracking-[-0.01em]'
        // The row a preview above stands for lights up while the preview is pointed at
        const linked = preview === ('to' in a ? a.to : a.file)
        const name = `min-w-0 flex-1 font-medium ${UNDERLINE} group-hover:decoration-black/40 group-hover:duration-0 ${linked ? 'group-has-[[data-preview]:hover]/preview:decoration-black/40 group-has-[[data-preview]:hover]/preview:duration-0' : ''}`
        const meta = `shrink-0 text-[#999] [font-feature-settings:"tnum"_1] group-hover:text-black ${linked ? 'group-has-[[data-preview]:hover]/preview:text-black' : ''}`
        if ('to' in a) {
          return (
            <Link key={a.to} to={a.to} className={row}>
              <span aria-hidden className="w-4 shrink-0 text-center font-medium">↗</span>
              <span className={name}>{a.title}</span>
              <span className={meta}>{a.to}</span>
            </Link>
          )
        }
        const [n, unit] = fileSize(downloadSizes[a.file] ?? 0)
        return (
          <a key={a.file} href={`/downloads/${a.file}`} download className={row}>
            <span aria-hidden className="w-4 shrink-0 border-b border-black pb-px text-center font-medium">↓</span>
            <span className={name}>{a.file}</span>
            <span className={meta}>{number.format(n)} {unit}</span>
          </a>
        )
      })}
    </div>
  )
}

/**
 * A picture that does what one row of the `Assets` under it does: opens the page or downloads the file. Pointing at
 * the picture marks that row as hovered, so the two read as one link. Put both inside a `group/preview` element and
 * pass the row's file or path to `Assets` as `preview`.
 */
function PreviewLink({ asset, label, children }: { asset: Asset; label: string; children: ReactNode }) {
  const className = 'block outline-none focus-visible:ring-2 focus-visible:ring-black/30'
  return 'to' in asset
    ? <Link to={asset.to} aria-label={label} data-preview className={className}>{children}</Link>
    : <a href={`/downloads/${asset.file}`} download aria-label={label} data-preview className={className}>{children}</a>
}

/** A constructor page's preview over its ↗ row; `flush` sets the row right under the preview, with no gap. */
function Constructor({ to, title, flush, children }: { to: string; title: string; flush?: boolean; children: ReactNode }) {
  return (
    <div className={`group/preview flex flex-col ${flush ? '' : 'gap-6'}`}>
      <PreviewLink asset={{ to, title }} label={title}>{children}</PreviewLink>
      <Assets items={[{ to, title }]} preview={to} />
    </div>
  )
}

/** The Носители overview (Figma 4844:6695): each medium's picture right over its ↗ row to the constructor, carrying its anchor; in `MEDIA` order. */
function Carriers({ items }: { items: typeof MEDIA }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {items.map(c => (
        <div key={c.to} id={c.id} className={`scroll-mt-24 ${isWide(c) ? 'md:col-span-2' : ''}`}>
          <Constructor to={c.to} title={c.title} flush>{c.picture}</Constructor>
        </div>
      ))}
    </div>
  )
}

/** A heading + text group. Sections are separated by 144px; a Chapter adds 72px on top of its first one. */
function Section({ children }: { children: ReactNode }) {
  return <section className="flex flex-col gap-8 md:gap-12">{children}</section>
}

function Head({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-6">{children}</div>
}

// ─── Content ─────────────────────────────────────────────────────────────────

// Vercel's own release: Google Fonts has no direct download link any more, only its specimen page.
const GEIST_ZIP = 'https://github.com/vercel/geist-font/releases/download/v1.7.2/geist-font-v1.7.2.zip'

const UMO5_SUBTITLE = <>Электромобиль с Алисой на борту<br />от 2.5 млн ₽</>
const UMO8_SUBTITLE = <>Гибридный кроссовер<br />с Алисой на борту от 5 млн. ₽</>

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
  const cols = 'md:grid-cols-[1fr_1fr_2fr]'
  const mark = (m: string) => <span className="w-[30px] [font-feature-settings:'case'_1]">{m}</span>
  return (
    <div className="text-[16px] leading-[1.25] tracking-[-0.01em]">
      <div className={`hidden md:grid ${cols} gap-x-6 py-4 font-medium`}>
        <p className="flex gap-2">Стандарт бренда {mark('✓')}</p>
        <p className="flex gap-2">Ошибка {mark('✗')}</p>
        <p>Мотивация</p>
      </div>
      {DICTIONARY.map((row, i) => (
        <div key={i} className={`grid grid-cols-1 ${cols} gap-x-6 gap-y-2 border-t border-[#e6e6e6] py-4`}>
          <p className="font-medium"><span className="md:hidden">✓&nbsp;</span>{row.good}</p>
          <p><span className="md:hidden">✗&nbsp;</span>{row.bad}</p>
          <p className="text-black/60 md:text-black">{row.why}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Guide() {
  const active = useActiveSection()
  const pageRef = useRef<HTMLDivElement>(null)
  useTypograf(pageRef)
  const [expandAll, toggleExpandAll] = useExpandAll()
  const [menuOpen, setMenuOpen] = useState(false)
  const asideRef = useRef<HTMLElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  useActiveInView(asideRef, active, expandAll)
  const quickRef = useRef<HTMLElement>(null)
  useHeroStrip(pageRef, quickRef, bodyRef)
  useHeroReveal(bodyRef, asideRef)
  // The contents row does what it says; on the first screen it also takes the page up over the photo, where the
  // contents can be seen.
  const onTocToggle = () => {
    toggleExpandAll()
    const top = bodyRef.current?.getBoundingClientRect().top ?? 0
    if (top > 1) window.scrollTo({ top: window.scrollY + top, behavior: 'smooth' })
  }
  // Two headings rarely share a line on a phone; when they do (Видение / Миссия), the first one names the place.
  const sectionTitle = active.length ? TITLES[active[0]] : undefined

  // The open mobile contents cover the page: keep the page behind still, and let Esc close it.
  useEffect(() => {
    if (!menuOpen) return
    const root = document.documentElement
    root.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => {
      root.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  useEffect(() => {
    // Anchors renamed since links went out: send them to where that content lives now, and fix the address.
    const current = () => {
      const id = decodeURIComponent(window.location.hash.slice(1))
      if (!(id in OLD_ANCHORS)) return id
      const to = OLD_ANCHORS[id]
      history.replaceState(null, '', to === 'top' ? window.location.pathname : `#${to}`)
      return to
    }
    // The page is lazy-loaded, so the browser's own jump to #hash on load finds nothing yet.
    // Jump again once CoFo Sans has loaded: the swap from the fallback font changes text heights above the target.
    const id = current()
    if (id) {
      const jump = () => document.getElementById(id)?.scrollIntoView()
      jump()
      document.fonts?.ready.then(jump)
    }
    // An old anchor opened on the page that's already here: the browser finds nothing to jump to, so jump ourselves.
    const onHash = () => {
      if (!(decodeURIComponent(window.location.hash.slice(1)) in OLD_ANCHORS)) return
      document.getElementById(current())?.scrollIntoView()
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return (
    <div ref={pageRef} id="top" className="min-h-screen bg-white font-sans text-black">
      {/* The hero is the top of the page: the logo leads here, and it isn't in the contents. On a phone it's the first
          picture, above the header, and covers the header's upward white (z-30). From lg it's fixed behind the page,
          which starts a strip above the bottom of the screen (`--strip`, see useHeroStrip; 252px for a three-line
          statement), so the first screen shows the logo, the row and the statement, then slides up over the photo
          (Figma 4893:3846, prototype 4921:2352). */}
      <Hero bodyRef={bodyRef} />

      <div ref={bodyRef} className="bg-white lg:relative lg:z-10 lg:mt-[calc(100vh-var(--strip,286px))] lg:flex lg:items-start">
      {/* Desktop sidebar. The expand row sits at the bottom of the screen, so it stays put while the open chapter
          changes the list's height, and sticks there when the list is taller than the screen, cutting the list off —
          enough of a hint that it scrolls, so the scrollbar, far from the text at this width, is hidden. */}
      <aside ref={asideRef} className="hidden lg:flex sticky top-0 h-screen w-[320px] xl:w-[480px] shrink-0 flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="sticky top-0 z-10 bg-white p-6"><a href="#top" onClick={toTop} aria-label="В начало" data-logo className="block w-[200px]"><Logo className="w-full" /></a></div>
        {/* The row is fixed to the bottom of the screen — not moved there by script, which lags the scroll a frame and
            makes it shake — so the list keeps its height free at the end. */}
        <div className="px-6 pb-[68px]"><Nav active={active} expandAll={expandAll} /></div>
        <TocToggle expanded={expandAll} onClick={onTocToggle} className="fixed bottom-0 left-0 z-10 w-[320px] p-6 xl:w-[480px]" />
      </aside>

      {/* Mobile top bar. iOS 26 browsers draw the page under their translucent top bar and stick `top: 0` below it,
          so the white is extended a screen upwards to hide content scrolling above the header. */}
      <header className="lg:hidden sticky top-0 z-20 bg-white p-4 md:p-6 before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-screen before:bg-white before:content-['']">
        <a href="#top" onClick={toTop} aria-label="В начало" className="block w-fit"><Logo /></a>
      </header>

      {/* Mobile table of contents: a bar at the bottom names the heading you're reading and stands in for the
          sidebar; tapped, the full contents open between the header and the bar, which turns into «Свернуть». */}
      <div className="lg:hidden">
        {menuOpen && (
          <div className="fixed inset-x-0 top-14 bottom-0 z-40 overflow-y-auto overscroll-contain bg-white px-4 pt-4 md:top-[72px] md:px-6 md:pt-6">
            <Nav active={active} expandAll onNavigate={() => setMenuOpen(false)} />
            <TocToggle
              expanded
              onClick={() => setMenuOpen(false)}
              className="sticky bottom-0 -mx-4 w-[calc(100%+2rem)] px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] md:-mx-6 md:w-[calc(100%+3rem)] md:px-6 md:pt-6 md:pb-[max(24px,env(safe-area-inset-bottom))]"
            />
          </div>
        )}
        {!menuOpen && (
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={false}
            aria-label={`Содержание: ${sectionTitle ?? TITLES.brand}`}
            className="fixed inset-x-0 bottom-0 z-40 flex cursor-pointer items-start gap-2 bg-white px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] text-left text-[16px] font-medium leading-[1.25] tracking-[-0.01em] md:px-6 md:pt-6 md:pb-[max(24px,env(safe-area-inset-bottom))]"
          >
            <TocIcon name="menu" />
            <span className="min-w-0 flex-1 truncate">{sectionTitle ?? TITLES.brand}</span>
          </button>
        )}
      </div>

      {/* 16px on top from lg: the statement's capitals then stand level with the top of the logo beside it. */}
      <main className="min-w-0 flex-1 p-4 pb-[calc(52px+1rem)] md:p-6 md:pb-[calc(68px+1.5rem)] lg:pt-4 lg:pb-6">
        <div className="flex max-w-[1200px] flex-col gap-section">
          {/* Платформа бренда follows the hero without a title of its own — the statement stands in for it and carries
              the chapter anchor. */}
          <div>
            <div className="flex flex-col gap-section">
              {/* From lg the statement is 60px in the 912px Figma column and scales with the column below that
                  (6.58cqw), so it wraps the same three lines at any width. Its capitals stand level with the top of
                  the logo: the body's 16px on top, plus 8px less CoFo Sans's 0.164em above the caps. */}
              <div className="flex flex-col gap-8 md:gap-12 lg:[container-type:inline-size]">
                <p id="brand" className="scroll-mt-24 text-[32px] font-medium leading-none tracking-[-0.01em] md:text-[48px] lg:mt-[calc(8px-0.164em)] lg:max-w-[912px] lg:scroll-mt-[calc(24px-0.164em)] lg:text-[min(60px,6.58cqw)]">
                  Автомобильный бренд, созданный в технологическом партнёрстве с Яндексом
                </p>
                {/* Quick links: into the guide, from its first section, and to the templated media, the constructors among them */}
                <nav aria-label="Быстрые ссылки" ref={quickRef} className="flex flex-wrap gap-x-6 gap-y-2 text-[16px] font-medium leading-[1.25] tracking-[-0.01em]">
                  <a href="#positioning" className={LINK_HOVER}>Стандарты</a>
                  <a href="#materials" className={LINK_HOVER}>{TITLES.materials}</a>
                </nav>
              </div>
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
                  <H2 id="examples">Примеры</H2>
                  <Text><p>Лучше один раз увидеть: UMO говорит по-человечески и уважительно на вы.</p></Text>
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
            </div>
          </div>

          {/* ── Логотип ── */}
          <Chapter id="logo" title="Логотип">
            <Section>
              <Text>
                <p>Логотип UMO не буквы, а модули.</p>
                <p>Словесный знак собран из элементов, как из конструктора — чистая геометрия и инженерия. Это визуальный эквивалент главной идеи бренда — город как система, а автомобиль как её умный, технологичный элемент.</p>
              </Text>
              <div className="group/preview flex flex-col gap-6">
                <PreviewLink asset={{ file: 'umo-logo.svg' }} label="Скачать логотип, SVG">
                  <LogoPlate w={912} h={456} logo={480} bg="#f5f5f5" />
                </PreviewLink>
                <Assets items={[{ file: 'umo-logo.svg' }, { file: 'umo-logo-png.zip' }]} preview="umo-logo.svg" />
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Fig name="placement-exterior" w={912} h={456} className="md:col-span-2" alt="Логотип на передней части UMO 8" />
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
              <div className="flex flex-col gap-6">
                <Fig name="clearspace" w={912} h={456} alt="Схема охранного поля логотипа: U со всех сторон" />
                <Fig name="minsize" w={912} h={304} alt="Минимальный размер: аналоговый ≥20 мм, цифровой ≥40 px" />
              </div>
            </Section>

            <Section>
              <Head>
                <H2 id="logo-color">Цвет логотипа</H2>
                <Text><p>Цвет логотипа подбирается по контрасту, яркости и тону фона: белый или черный.</p></Text>
              </Head>
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <LogoPlate w={444} h={333} logo={240} bg="#000" dark caption="Белый для тёмного фона" />
                  <LogoPlate w={444} h={333} logo={240} bg="#f5f5f5" caption="Чёрный для светлого фона" />
                </div>
                <figure className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <Photo name="color-photo" />
                    <LogoPlate w={210} h={280} logo={120} bg="#fc3f1d" dark />
                    <LogoPlate w={210} h={280} logo={120} bg="#ffea00" />
                    <Photo name="color-light" />
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
                  <p>Размещая логотип на мелких форматах рекомендуется учитывать минимальные размеры и отступы.</p>
                  <p>Иконка сайта — исключение.</p>
                </Text>
              </Head>
              <div className="group/preview flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Fig name="icon-app" w={444} h={333} caption="Иконка мобильного приложения" />
                  <Fig name="icon-userpic" w={444} h={333} caption="Юзерпик аккаунта соцсетей" />
                  <PreviewLink asset={{ file: 'umo-favicon.svg' }} label="Скачать фавиконку, SVG">
                    <Fig name="icon-favicon" w={444} h={333} caption="Фавиконка и иконка закладок в браузере" alt="Фавиконка во вкладке тёмного браузера" />
                  </PreviewLink>
                  <PreviewLink asset={{ file: 'umo-favicon.svg' }} label="Скачать фавиконку, SVG">
                    <Fig name="icon-favicon-light" w={444} h={333} alt="Фавиконка во вкладке светлого браузера" />
                  </PreviewLink>
                </div>
                <Assets items={[{ file: 'umo-favicon.svg' }, { file: 'umo-favicon.ico' }]} preview="umo-favicon.svg" />
              </div>
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
              <div className="group/preview flex flex-col gap-6">
                <Fig name="cobrand-square" w={912} h={304} alt="Схема кобрендинга с квадратным логотипом" />
                <PreviewLink asset={{ file: 'umo-yandex.svg' }} label="Скачать логотип UMO | Яндекс, SVG">
                  <Fig name="cobrand-square-example" w={912} h={304} alt="UMO и Яндекс" />
                </PreviewLink>
                <Assets items={[{ file: 'umo-yandex.svg' }, { file: 'umo-yandex-png.zip' }]} preview="umo-yandex.svg" />
              </div>
              <div className="flex flex-col gap-6">
                <Fig name="cobrand-horizontal" w={912} h={304} alt="Схема кобрендинга с горизонтальным логотипом" />
                <Fig name="cobrand-horizontal-example" w={912} h={304} alt="UMO и EVM" />
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
              <div className="flex flex-col gap-6">
                <figure className="flex flex-col gap-3">
                  <div className="flex aspect-[2/1] items-center justify-center bg-[#f5f5f5]">
                    <p className="text-[48px] sm:text-[72px] md:text-[96px] font-medium leading-none tracking-[-0.01em]">CoFo Sans</p>
                  </div>
                  <Caption>Базовая гарнитура</Caption>
                </figure>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Fig name="lettering-model8" w={444} h={333} alt="Леттеринг MODEL 8 и номерная плашка UMO 8" />
                  <Fig name="lettering-model5" w={444} h={333} alt="Леттеринг MODEL 5 и номерная плашка UMO 5" />
                  <Fig name="lettering-umo8" w={444} h={333} alt="Леттеринг на UMO 8" />
                  <Fig name="lettering-umo5" w={444} h={333} alt="Леттеринг на кузове UMO 5" />
                </div>
                {/* Columns follow the pictures: UMO 8 on the left, UMO 5 on the right. */}
                <Assets
                  items={[
                    { file: 'umo-model-8.svg' }, { file: 'umo-model-8-png.zip' }, { file: 'umo-plate-8-svg.zip' },
                    { file: 'umo-model-5.svg' }, { file: 'umo-model-5-png.zip' }, { file: 'umo-plate-5-svg.zip' },
                  ]}
                />
              </div>
            </Section>

            <Section>
              <H2 id="made-in-moscow">Сделано в Москве</H2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Fig name="moscow-umo5" w={444} h={368} alt="Шильдик «Сделано в Москве» на UMO 5" />
                <Fig name="moscow-umo8" w={444} h={368} alt="Шильдик «Сделано в Москве» на UMO 8" />
              </div>
            </Section>
          </Chapter>

          {/* ── Ключевой образ ── */}
          <Chapter id="key-visual" title="Ключевой образ">
            <Section>
              <Text>
                <p>Ключевой образ — лицо модели в рекламе.</p>
                <p>Как и логотип, он собран из модулей: фотография, короткий заголовок и локап UMO | Яндекс. Образ у каждой модели свой, а правила общие — поэтому реклама UMO узнаётся с первого взгляда.</p>
              </Text>
              {/* Picture above the heading, as in Позиционирование; the anchor sits on it so links land on the picture */}
              <div id="photography" className="scroll-mt-24"><Fig name="keyvisual" w={912} h={456} /></div>
              <Head>
                <H2>Фотография</H2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 *:max-w-none">
                  <Text><p>Без излишней постановочности и драмы. Изображение захватывает взгляд, потому что все, что видит зритель, происходит здесь и сейчас.</p></Text>
                  <Text><p>Автомобили становятся частью мира аудитории, но показаны в выгодном ракурсе, который подчеркивает преимущества или рассказывает историю за счет окружения.</p></Text>
                </div>
              </Head>
            </Section>

            <Section>
              <Head>
                <H2 id="kv-umo5">UMO 5</H2>
                <Text><p>Ключевой образ и рекламные материалы для UMO Model 5</p></Text>
              </Head>
              <div className="flex flex-col gap-6">
                <Fig name="umo5-kv" focus={72} w={912} h={456} alt="Ключевой образ UMO 5" />
                <div className="grid grid-cols-1 sm:grid-cols-[600fr_288fr] gap-6">
                  <Poster bg="umo5-banner-bg" w={600} h={368} title="Новый UMO 5" subtitle={UMO5_SUBTITLE} alt="Горизонтальный баннер UMO 5" />
                  <Poster bg="umo5-square-bg" w={288} h={368} title="Новый UMO 5" subtitle={UMO5_SUBTITLE} center alt="Вертикальный баннер UMO 5" />
                </div>
              </div>
            </Section>

            <Section>
              <Head>
                <H2 id="kv-umo8">UMO 8</H2>
                <Text><p>Ключевой образ и рекламные материалы для UMO Model 8</p></Text>
              </Head>
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-[288fr_600fr] gap-6">
                  <div className="order-2 sm:order-none">
                    <Poster bg="umo8-square-bg" w={288} h={368} title="Новый UMO 8" subtitle={UMO8_SUBTITLE} center alt="Вертикальный баннер UMO 8" />
                  </div>
                  <Poster bg="umo8-banner-bg" w={600} h={368} title="Новый UMO 8" subtitle={UMO8_SUBTITLE} alt="Горизонтальный баннер UMO 8" />
                </div>
                <Fig name="umo8-kv" w={912} h={456} alt="Ключевой образ UMO 8" />
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

          {/* ── Носители ── */}
          <Chapter id="materials" title="Носители">
            <Section>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 *:max-w-none">
                <Text>
                  <p>Носители — шаблоны, через которые бренд встречает покупателя у дилера: <Link to="/livery" className={TEXT_LINK}>ливрея демо-автомобиля</Link>, <Link to="/price-card" className={TEXT_LINK}>прайс-карта</Link>, <Link to="/name-tag" className={TEXT_LINK}>бейдж сотрудника</Link> и <Link to="/plate-frame" className={TEXT_LINK}>рамка номера</Link>.</p>
                </Text>
                <Text>
                  <p>Каждый собирается в своём конструкторе: дилер вводит свои данные, а макет, шрифты и отступы уже настроены. На выходе — файлы, готовые к печати и производству.</p>
                </Text>
              </div>
              <Carriers items={MEDIA} />
            </Section>
          </Chapter>

          <footer className="text-[16px] leading-[1.25] tracking-[-0.01em] text-[#999]">Редакция 2026. ООО «ЭМ РУС». 0+</footer>
        </div>
      </main>
      </div>
    </div>
  )
}
