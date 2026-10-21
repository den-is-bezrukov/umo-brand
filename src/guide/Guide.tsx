import { Fragment, lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode, type RefObject } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import HeaderLogo, { COBRAND, setLogoFold } from '@brand/HeaderLogo'
import { CHAPTERS, OLD_ANCHORS, HERO, STATEMENT, MATERIALS_LEAD, INTRO_ORDER, DRAWN, Chapters, Contact, FOOTER } from '@brand/guide'
import tocIcons from '@/icons/toc'
import { useTypograf } from './typograf'
import Dialog from '@/ui/Dialog'
import { TEXT_LINK } from '@/ui/links'
import { GENERATORS, editTitle } from '@/data/generators'
import { Chapter, Section, Text, Constructor, UNDERLINE, LINK_HOVER, img, type Medium } from './parts'
import { SITE } from '@/site'

// The guide's page: the first screen, the contents (the sidebar, the phone's bottom bar and its sheet), the brand's
// chapters (`@brand/guide`), Материалы with every generator, the editor's window, Контакты.

type NavItem = { id: string; title: string; children?: NavItem[] }

/**
 * The media of Материалы. A wide picture (2:1 and wider) takes a whole row of
 * the overview grid, narrow ones pair up, and a narrow one moves up next to an unpaired one before it (what CSS
 * `grid-auto-flow: dense` would do). `MEDIA` is that packed order, so the grid and the sidebar's sub-items list the
 * media as they actually stand.
 */
// `row`: the ↗ row under the picture, named for what a dealer does there, so it reads as a tool to click into (not
// the medium's name alone, as the contents list it)
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
/**
 * A generator the cards above don't have yet gets one of its own after them, 444×333: its generator's picture
 * (`GENERATED`, loaded as the guide needs it), a grey card while there's none; until a picture is made for it, which
 * then goes up into `DRAWN`. The last of them goes wide, 912×456 as the livery's, when it would stand alone in its
 * row (an odd number of narrow cards), and narrow again once another generator pairs it
 */
const GENERATED: Record<string, React.LazyExoticComponent<(props: { wide?: boolean }) => ReactNode>> = {
  '/memo': lazy(() => import('@/memo/MemoPreview')),
}
const GreyCard = ({ wide }: { wide?: boolean }) => <div className={`${wide ? 'aspect-2/1' : 'aspect-4/3'} bg-surface`} />
const UNDRAWN = GENERATORS.filter(g => !DRAWN.some(m => m.to === g.path))
const LONE = (DRAWN.filter(m => !isWide(m)).length + UNDRAWN.length) % 2 === 1
const MEDIA_LIST: Medium[] = [
  ...DRAWN,
  ...UNDRAWN.map((g, i) => {
    const Picture = GENERATED[g.path] ?? GreyCard
    const wide = LONE && i === UNDRAWN.length - 1
    return {
      id: g.path.slice(1), to: g.path, title: g.title, row: g.row ?? g.title, w: wide ? 912 : 444, h: wide ? 456 : 333,
      picture: <Suspense fallback={<GreyCard wide={wide} />}><Picture wide={wide} /></Suspense>,
    }
  }),
]
const MEDIA = packMedia(MEDIA_LIST)
const rank = (path: string) => { const i = INTRO_ORDER.indexOf(path); return i < 0 ? INTRO_ORDER.length : i }
const INTRO = [...GENERATORS].sort((a, b) => rank(a.path) - rank(b.path))

const NAV: NavItem[] = [
  ...CHAPTERS,
  { id: 'materials', title: 'Материалы', children: MEDIA.map(({ id, title }) => ({ id, title })) },
  { id: 'contact', title: 'Контакты' },
]

const flatItems = (items: NavItem[]): NavItem[] => items.flatMap(i => [i, ...flatItems(i.children ?? [])])
const ALL_IDS = flatItems(NAV).map(i => i.id)
const TITLES: Record<string, string> = Object.fromEntries(flatItems(NAV).map(i => [i.id, i.title]))
/** Whether `id` is this item or anything nested under it. */
const contains = (item: NavItem, id: string): boolean => item.id === id || !!item.children?.some(c => contains(c, id))

/**
 * Ids of the lowest section heading that has scrolled past the upper third of the viewport — several when headings
 * stand side by side on one line (Видение / Миссия), so every one you can see next to it is lit. Over the last screen
 * of scroll the line slides down to two thirds, so the last chapters, which the page's end keeps from rising far, get
 * lit by the time their heading is about mid-screen (Контакты reached the third only in the last 8 px on a phone).
 */
function useActiveSection() {
  const [active, setActive] = useState<string[]>([])
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const h = window.innerHeight
      const left = document.documentElement.scrollHeight - h - window.scrollY
      const line = h / 3 + (h / 3) * (1 - Math.min(1, Math.max(0, left) / h))
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
const NAV_HOVER = 'transition-[color] duration-350 ease-[ease] hover:text-caption hover:duration-0'


/**
 * `active`: you're inside this item (medium weight); `current`: its own heading is the one on screen (the bullet).
 * The space between items is the links' own padding (`pad`), not gaps, so the whole list is clickable.
 */
/**
 * A chapter title stuck at the top of the sheet's list, 8px under its edge where its text stands as on the first line.
 * Its own 8px over the text is covered upwards (a white shadow): there's nothing there but the gap after the last
 * item, so a title in its place hides nothing; and 4px under it, an item's own padding, so the descenders of the item
 * scrolling away under it don't peek out below. Titles stand 2px in from the list's edge (a margin, so the bullet keeps to
 * the text), their items 22px further. Its bullet stands about midway between the screen's edge and the text.
 */
const STICKY_CHAPTER = 'ml-0.5 py-2 sticky top-2 z-10 bg-white shadow-[0_-8px_0_white,0_4px_0_white]'

function NavLink({ id, title, active, current, onNavigate, pad, bullet = '-left-[0.9em]' }: { id: string; title: string; active: boolean; current: boolean; onNavigate?: () => void; pad: string; bullet?: string }) {
  return (
    <a
      href={`#${id}`}
      onClick={onNavigate}
      aria-current={active ? 'location' : undefined}
      className={`relative block leading-[1.25] ${pad} ${active ? 'font-medium' : NAV_HOVER}`}
    >
      {current && <span aria-hidden className={`absolute ${bullet}`}>•</span>}
      {title}
    </a>
  )
}

/** Table-of-contents icon, 16×16 on a 20px line: the menu bars to open the contents, the chevrons to fold them. */
function TocIcon({ name }: { name: keyof typeof tocIcons }) {
  // The bars end flush at 1 and 15; the chevrons' (both pairs) square ends and bevels are part of their drawing
  const ends = name !== 'menu' ? { strokeLinecap: 'square', strokeLinejoin: 'bevel' } as const : {}
  return (
    <span aria-hidden className="flex h-5 shrink-0 items-center">
      <svg width="16" height="16" viewBox="0 0 16 16" className="block">
        <path d={tocIcons[name]} fill="none" stroke="currentColor" strokeWidth="2" {...ends} />
      </svg>
    </span>
  )
}

/**
 * Expand-all row at the foot of the table of contents, «Содержание» (not «Меню», which repeats the icon and promises to
 * open what's open already): the menu bars spread every chapter, and the row turns into «Свернуть» with its chevrons.
 */
function TocToggle({ expanded, onClick, className = '' }: { expanded: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-label={expanded ? 'Свернуть содержание' : 'Развернуть содержание'}
      // No width of its own: both places set it, and a `w-full` here outranked theirs in the built CSS
      className={`flex cursor-pointer items-start gap-2 bg-white ${NAV_HOVER} text-left text-[16px] font-medium leading-[1.25] tracking-[-0.01em] ${className}`}
    >
      <TocIcon name={expanded ? 'close' : 'menu'} />
      {expanded ? 'Свернуть' : 'Содержание'}
    </button>
  )
}

/**
 * `stickyChapters` (the phone's sheet): a chapter's title stays at the top of the list while its items scroll by, and
 * every row, chapter or item, is 36px tall (its 20px line and 8px over and under), easier for a finger than the
 * sidebar's 28px items and one grid for the sheet's height and stops
 */
function Nav({ active, expandAll, onNavigate, stickyChapters }: { active: string[]; expandAll: boolean; onNavigate?: () => void; stickyChapters?: boolean }) {
  const activeChapter = NAV.find(c => active.some(id => contains(c, id)))?.id
  // Above the first chapter (the first screen) Платформа бренда stands open and lit, so the list doesn't start bare
  const openChapter = activeChapter ?? NAV[0].id
  return (
    // Chapters 8px above and under (16px apart), items 4px (8px apart): chapter → first item 12px; the last item takes
    // 8px under it, so it's 16px to the next chapter, and so does an item over its own nested items (12px to them).
    // The first and last chapters' 8px go under what's above and below the list (-my-2), so the text stays put.
    <nav className="-my-2 flex flex-col text-[16px] tracking-[-0.01em]">
      {NAV.map(chapter => {
        // Like guides.area17.com: only the chapter you're reading is open, unless everything is expanded.
        const open = expandAll || openChapter === chapter.id
        return (
          <div key={chapter.id} className="flex flex-col">
            <NavLink id={chapter.id} title={chapter.title} active={openChapter === chapter.id} current={active.includes(chapter.id)} onNavigate={onNavigate} pad={stickyChapters ? STICKY_CHAPTER : 'py-2'} bullet={stickyChapters ? '-left-3' : undefined} />
            {chapter.children && (
              <div
                inert={!open}
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="flex flex-col pl-6">
                    {chapter.children.map(s => (
                      <div key={s.id} className="group/item flex flex-col">
                        <NavLink id={s.id} title={s.title} active={active.some(id => contains(s, id))} current={active.includes(s.id)} onNavigate={onNavigate} pad={stickyChapters ? 'py-2' : s.children ? 'pt-1 pb-2' : 'py-1 group-last/item:pb-2'} />
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
 * Trial: the sidebar wordmark's height with the Y cobrand on the first screen, in the statement's em (the brand
 * font's capitals are 0.68 em, so the wordmark stands as high as them as the statement's size follows the screen), and in px alone
 * once folded.
 */
const LOGO_HEIGHT = { open: 0.68, folded: 24 }

/**
 * Trial: what the first screen adds to the sidebar's 24 px on top, left and bottom for the Y's circle, which overhangs
 * the wordmark by a third of its height (10–14 px); none without the cobrand.
 */
const LOGO_PAD = COBRAND ? 12 : 0

/**
 * Trial: below lg, white between the film and the header for the Y's circle, which overhangs the wordmark by 8 px there, so it
 * stands as far from the film as the header's padding; it scrolls away with the film, the stuck header keeps its own.
 */
const LOGO_GAP = COBRAND ? 8 : 0

/**
 * While the page slides up over the hero, the sidebar's toggle row stays fixed at the bottom of the screen, while the
 * sidebar runs off it, so the contents unroll between the logo and the row as the page rises. They fade in over the
 * first 160px of scroll: on the first screen there's only the logo and the row. The logo, 200px wide on the first
 * screen, shrinks with the scroll to its usual 120 (24 high) by the time the page reaches the top. Returns whether the
 * contents are in view (half faded in or more), so the toggle row shows the menu bars on the first screen, where
 * there's nothing to fold, even while the list is expanded.
 */
function useHeroReveal(bodyRef: RefObject<HTMLElement | null>, asideRef: RefObject<HTMLElement | null>) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    let frame = 0
    let open = 40
    // The fold's moves that depend on the screen, as keyframes (index.css has them for a 60px statement until then).
    const keyframes = document.createElement('style')
    document.head.appendChild(keyframes)
    // What changes with the screen, not the scroll: how far the page rises (the fold's length), the statement's
    // capitals, the sidebar's width.
    const layout = () => {
      const body = bodyRef.current
      const aside = asideRef.current
      if (!body || !aside) return
      const fold = `${body.offsetTop}px`
      if (body.style.getPropertyValue('--logo-fold') !== fold) body.style.setProperty('--logo-fold', fold)
      const overhang = `${LOGO_PAD}px`
      if (body.style.getPropertyValue('--logo-overhang') !== overhang) body.style.setProperty('--logo-overhang', overhang)
      // From lg the sidebar's wordmark starts as high as the statement's capitals, or lower where the unfolded lockup
      // (5/3 of it, 5 times its height wide; without the cobrand, the wordmark alone) wouldn't fit the sidebar, and
      // folds to 24. It's drawn at that starting size (the unit `--u`) and scaled down, so it stays sharp.
      const statement = document.getElementById('statement')
      const caps = LOGO_HEIGHT.open * (statement ? parseFloat(getComputedStyle(statement).fontSize) : 60)
      open = Math.round(Math.min(caps, (aside.clientWidth - 48) * (COBRAND ? 0.6 : 1) / 5) * 100) / 100
      aside.style.setProperty('--u', `${open / 60}px`)
      const css = logoKeyframes(open)
      if (keyframes.textContent !== css) keyframes.textContent = css
    }
    const update = () => {
      frame = 0
      const body = bodyRef.current
      const aside = asideRef.current
      if (!body || !aside) return
      const opacity = Math.min(1, window.scrollY / 160)
      const nav = aside.querySelector<HTMLElement>('nav')
      if (nav) nav.style.visibility = opacity ? '' : 'hidden'
      setShown(opacity >= 0.5)
      if (SCROLL_TIMELINE) return
      // Without scroll timelines the script makes the moves of index.css frame by frame.
      const t = 1 - Math.min(1, Math.max(0, body.getBoundingClientRect().top) / Math.max(1, body.offsetTop))
      document.querySelectorAll<HTMLElement>('[data-logo-layers]').forEach(el => setLogoFold(el, t))
      const pad = LOGO_PAD * (1 - t)
      const move = (selector: string, transform: string) => {
        const el = aside.querySelector<HTMLElement>(selector)
        if (el) el.style.transform = transform
      }
      move('[data-logo-desk]', `translate(${pad}px, ${pad}px) scale(${1 + (LOGO_HEIGHT.folded / open - 1) * t})`)
      move('[data-logo-nav]', `translate(${pad}px, ${(open + LOGO_PAD - LOGO_HEIGHT.folded) * (1 - t)}px)`)
      move('[data-logo-toggle]', `translate(${pad}px, ${-pad}px)`)
      if (nav) nav.style.opacity = String(opacity)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    const onResize = () => { layout(); onScroll() }
    onResize()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(frame)
      keyframes.remove()
    }
  }, [bodyRef, asideRef])
  return shown
}

/**
 * The sidebar's fold from lg, for a wordmark starting `open` px high: it scales down to 24, and the logo, the contents
 * and their toggle row come in from the first screen's extra LOGO_PAD to the usual 24 — the contents also rising by
 * what the logo loses in height. All moves, no layout, so the browser runs them on the scroll (see index.css).
 */
function logoKeyframes(open: number) {
  const p = LOGO_PAD
  return [
    `@keyframes logo-desk { from { transform: translate(${p}px, ${p}px) scale(1) } to { transform: translate(0px, 0px) scale(${LOGO_HEIGHT.folded / open}) } }`,
    `@keyframes logo-nav { from { transform: translate(${p}px, ${open + p - LOGO_HEIGHT.folded}px) } to { transform: translate(0px, 0px) } }`,
    `@keyframes logo-toggle { from { transform: translate(${p}px, ${-p}px) } to { transform: translate(0px, 0px) } }`,
  ].join('\n')
}

/** Whether the browser runs CSS animations on the page's scroll (index.css folds the header's lockup with it). */
const SCROLL_TIMELINE = typeof CSS !== 'undefined' && CSS.supports('animation-timeline: scroll()')

/** Trial: how far, in px, a scroll has to go before useHeroSnap carries it on; 0 carries any. */
const HERO_SNAP_MIN = 0

/**
 * Trial: a scroll that stops between the photo and the page risen over it (below lg, scrolled up to the header) is
 * carried on, smoothly, to the end it was heading for (HERO_SNAP_MIN or more), or back where it started, so the lockup
 * never rests half folded. It waits for the scroll to end, inertia included, and for a finger on the screen to let go;
 * not with reduced motion.
 */
function useHeroSnap(bodyRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)')
    let start: number | null = null
    let timer = 0
    const settle = () => {
      const body = bodyRef.current
      const from = start
      start = null
      if (!body || from === null || touching || still.matches) return
      const end = body.offsetTop
      const y = window.scrollY
      if (y <= 0 || y >= end) return
      const by = y - from
      const to = by > HERO_SNAP_MIN ? end : by < -HERO_SNAP_MIN ? 0 : from <= end / 2 ? 0 : end
      window.scrollTo({ top: to, behavior: 'smooth' })
    }
    const onScroll = () => {
      if (start === null) start = lastY
      lastY = window.scrollY
      clearTimeout(timer)
      timer = window.setTimeout(settle, 150)
    }
    let lastY = window.scrollY
    let touching = false
    const onTouchStart = () => { touching = true }
    const onTouchEnd = () => {
      touching = false
      clearTimeout(timer)
      timer = window.setTimeout(settle, 150)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
      clearTimeout(timer)
    }
  }, [bodyRef])
}

/**
 * Height of the first screen's white strip (`--strip` on the page), from lg. The statement's capitals stand level with
 * the top of the logo (the body's 16px on top plus the brand font's 0.164em above the caps at leading 1 make the logo's 24),
 * and the quick links under it share a line with the toggle row at the bottom of the screen (the row's 20px line starts
 * 24px into its 68), however many lines the statement wraps to.
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
      // Below lg: how far the statement and the quick links under it (where they aren't in the bottom bar) end under the
      // top of the page, header included, for the film to take the rest of the first screen (see Hero).
      const mstrip = Math.round(block.getBoundingClientRect().bottom - body.getBoundingClientRect().top)
      page.style.setProperty('--mstrip', `${mstrip}px`)
      // Where that would leave the film less than half the width or 40% of the height (a phone held sideways, a short
      // window), the film takes the whole first screen down to the bar instead, so the bar doesn't cut the statement.
      const md = window.matchMedia('(min-width: 48rem)').matches
      const film = window.innerHeight - mstrip - (md ? 92 : 68) - LOGO_GAP
      page.toggleAttribute('data-hero-full', !window.matchMedia('(min-width: 64rem)').matches && film < Math.min(window.innerWidth / 2, window.innerHeight * 0.4))
      // The toggle row's bottom padding grows by the Y's overhang on the first screen (see useHeroReveal), lifting its line.
      const overhang = parseFloat(body.style.getPropertyValue('--logo-overhang')) || 0
      const strip = `${Math.round(16 + quick.offsetTop - block.offsetTop + 68 - 24 + overhang)}px`
      if (page.style.getPropertyValue('--strip') === strip) return
      page.style.setProperty('--strip', strip)
      // The page now starts elsewhere: let useHeroReveal place the toggle row and size the logo anew.
      window.dispatchEvent(new Event('resize'))
    }
    // A frame later, out of the observer's own pass, so moving the page doesn't loop it.
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    const observer = new ResizeObserver(schedule)
    observer.observe(block)
    window.addEventListener('resize', schedule)
    return () => { observer.disconnect(); window.removeEventListener('resize', schedule); cancelAnimationFrame(frame) }
  }, [pageRef, quickRef, bodyRef])
}

/**
 * The hero: the brand's film, looped and muted — the source MP4s as they came (H.264, no re-encoding: they're
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
    return ['slow-2g', '2g', '3g'].includes(type) ? HERO.small : HERO.video
  })
  // Still not enough buffered to play after 3 s: the lighter film instead
  useEffect(() => {
    if (still || src !== HERO.video) return
    const t = setTimeout(() => {
      const video = videoRef.current
      if (video && video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) setSrc(HERO.small)
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
    <div ref={ref} style={{ '--logo-gap': `${LOGO_GAP}px` } as CSSProperties} className="relative z-30 h-[calc(100svh-var(--mstrip,260px)-68px-var(--logo-gap))] max-lg:mb-[var(--logo-gap)] md:h-[calc(100svh-var(--mstrip,360px)-92px-var(--logo-gap))] max-lg:[[data-hero-full]_&]:h-[calc(100svh-52px)] md:max-lg:[[data-hero-full]_&]:h-[calc(100svh-68px)] lg:fixed lg:inset-x-0 lg:top-0 lg:z-0 lg:h-[calc(100vh-var(--strip,286px))]">
      {still ? (
        <img src={img(HERO.still)} alt={HERO.stillAlt} width={1824} height={912} fetchPriority="high" decoding="async" className={`${fill} object-[50%_40%]`} />
      ) : (
        <video ref={videoRef} src={src} poster={img(HERO.poster)} autoPlay muted loop playsInline preload="auto" aria-hidden className={fill} />
      )}
    </div>
  )
}

/**
 * Below lg the quick links, as on wide screens, stand in the bottom bar beside the menu icon (on any phone: «Платформа»
 * without «бренда» under 420px, where it wouldn't fit), spaced as its edges (16px, from md 24), in
 * place of their own line under the statement, which leaves the film more of the first screen. They stand there until
 * the first section's heading is lit, and the section's name takes their place at once (not a fade over the first
 * 160px of scroll, which leaves the bar a stretch with the icon alone).
 */
/**
 * A quick link's tap area in the bar: the bar's whole height (its 16px over and under, 24 from md) and half the gap to
 * each neighbour, so a tap a little off the word still opens the link rather than the contents behind it
 */
const BAR_LINK = "relative after:absolute after:-inset-x-2 after:-inset-y-4 after:content-[''] md:after:-inset-x-3 md:after:-inset-y-6"

function BarLinks() {
  // 8px after the menu icon, as any label stands after its icon (the bar's gap less 8, 16 from md)
  return (
    // The full names at any width (a trial): where they run past the bar, it scrolls sideways to the screen's edge, its
    // 16px over and under (24 from md) kept in the scroller so the links' tap areas aren't clipped
    <nav aria-label="Быстрые ссылки" className="relative -my-4 -mr-4 -ml-2 flex min-w-0 gap-x-4 overflow-x-auto overscroll-x-contain py-4 pr-4 whitespace-nowrap [scrollbar-width:none] md:-my-6 md:-mr-6 md:-ml-4 md:gap-x-6 md:py-6 md:pr-6 [&::-webkit-scrollbar]:hidden">
      <a href="#brand" className={`${BAR_LINK} ${LINK_HOVER}`}>Платформа бренда</a>
      {/* Not under 380px, where the three and the icon don't fit the bar (it scrolls sideways, «Редактор» cut off) */}
      <a href="#materials" className={`${BAR_LINK} ${LINK_HOVER} max-[379px]:hidden`}>Материалы</a>
      <Link to="/editor" className={`${BAR_LINK} ${LINK_HOVER}`}>Редактор</Link>
    </nav>
  )
}

/**
 * The mobile contents sheet's moves, as the generators' sheet (docs/generators.md): it follows a finger — the bottom
 * bar pulled up brings it out from behind the bar, and pulled down it goes, by the bar or from anywhere on it while its
 * list is scrolled to the top (else the list scrolls) — and let go it goes on in 350 ms, slowing down, to the nearer of open and closed, its speed
 * not carrying it on; past open it gives at 30%. A tap, Esc or a link moves it the same way. It stays in the page, out
 * of sight closed, so it's measured and slides from the first touch; only transforms move.
 */
function useTocSheet(open: boolean, setOpen: (open: boolean) => void, list: RefObject<HTMLDivElement | null>) {
  const bar = useRef<HTMLDivElement>(null)
  const dim = useRef<HTMLDivElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  const pos = useRef(0)
  const dragging = useRef(false)
  const timer = useRef(0)
  const [api] = useState(() => {
    const place = (p: number, animate: boolean) => {
      const el = sheet.current
      const shade = dim.current
      if (!el || !shade) return
      clearTimeout(timer.current)
      pos.current = p
      const h = el.offsetHeight
      const move = animate ? 'transform 350ms cubic-bezier(0.33, 1, 0.68, 1)' : 'none'
      el.style.transition = move
      shade.style.transition = animate ? 'opacity 350ms cubic-bezier(0.33, 1, 0.68, 1)' : 'none'
      el.style.transform = `translateY(${p > 1 ? -(p - 1) * h * 0.3 : (1 - p) * h}px)`
      shade.style.opacity = String(Math.min(1, Math.max(0, p)))
      el.style.visibility = shade.style.visibility = 'visible'
      if (p <= 0) timer.current = window.setTimeout(() => { el.style.visibility = shade.style.visibility = '' }, animate ? 360 : 0)
    }
    return {
      bar, dim, sheet, place,
      // The list scrolled to the chapter you're reading, as the sheet comes into view: its title at the top, standing
      // as the first chapter's does (centred, it shows the chapter before as a cut-off tail above), or,
      // where the chapter runs past the sheet before the item you're at, that item in the middle.
      reveal: () => {
        const el = list.current
        const lit = el?.querySelectorAll<HTMLElement>('nav [aria-current]')
        const item = lit?.[lit.length - 1]
        const chapter = lit?.[0]?.parentElement
        const first = el?.querySelector('nav')?.firstElementChild
        if (!el || !item || !chapter || !first) return
        const box = el.getBoundingClientRect()
        const at = (node: Element) => node.getBoundingClientRect().top - box.top + el.scrollTop
        // Where the list may stand: with a chapter's title stuck at the top just where it stands anyway (its block 8px
        // above the edge, as the title sticks 8px down), or with an item whole right under a stuck title (44px down).
        // Anything else cut a row under the title in half, or left the stuck title of the chapter before peeking. The
        // list opens at the chapter you're reading; where that can't rise to the top (the last chapters) or the item
        // you're at would be under the sheet's edge, at the first place that has that item whole as the last row, the
        // list getting the few pixels of room under it that takes
        const inner = el.firstElementChild as HTMLElement | null
        if (inner) inner.style.paddingBottom = ''
        const stops: number[] = []
        for (const block of Array.from(first.parentElement!.children)) {
          stops.push(at(block) - 8)
          block.querySelectorAll('a').forEach((link, i) => { if (i) stops.push(at(link) - 44) })
        }
        const max = el.scrollHeight - el.clientHeight
        const end = at(item) + item.offsetHeight
        let top = Math.max(0, Math.round(at(chapter) - 8))
        if (top > max || end > top + el.clientHeight) {
          top = Math.max(0, Math.round(Math.min(...stops.filter(s => s >= end - el.clientHeight - 0.5))))
          if (inner && top > max) inner.style.paddingBottom = `${top - max}px`
        }
        el.scrollTop = top
        // Short of it still (the browser kept the old end), the room grows by what's missing
        if (inner && el.scrollTop < top - 0.5) {
          inner.style.paddingBottom = `${(parseFloat(inner.style.paddingBottom) || 0) + top - el.scrollTop}px`
          el.scrollTop = top
        }
      },
    }
  })

  const placed = useRef(false)
  useEffect(() => {
    // Put out of sight at once on the page's first render; slid from then on.
    if (!dragging.current) api.place(open ? 1 : 0, placed.current)
    placed.current = true
  }, [open, api])

  useEffect(() => {
    const barEl = bar.current
    const sheetEl = sheet.current
    if (!barEl || !sheetEl) return
    let start: { x: number, y: number, from: number, onBar: boolean, mode: 'open' | 'close' | 'none' | null } | null = null
    const down = (from: number) => (e: TouchEvent) => {
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY, from, onBar: barEl.contains(e.target as Node), mode: null }
    }
    const move = (e: TouchEvent) => {
      if (!start) return
      const dx = e.touches[0].clientX - start.x
      const dy = e.touches[0].clientY - start.y
      if (!start.mode) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
        const vertical = Math.abs(dy) > Math.abs(dx)
        if (start.from === 0) start.mode = vertical && dy < 0 ? 'open' : 'none'
        else start.mode = vertical && dy > 0 && (start.onBar || (list.current?.scrollTop ?? 0) <= 0) ? 'close' : 'none'
        if (start.mode === 'none') return
        dragging.current = true
        if (start.mode === 'open') api.reveal()
      }
      if (start.mode === 'none') return
      e.preventDefault()
      const h = sheetEl.offsetHeight || 1
      api.place(start.from - dy / h, false)
    }
    const up = (e: TouchEvent) => {
      const mode = start?.mode
      start = null
      if (mode !== 'open' && mode !== 'close') return
      e.preventDefault()
      dragging.current = false
      const target = pos.current >= 0.5
      api.place(target ? 1 : 0, true)
      setOpen(target)
    }
    const opts = { passive: false }
    const fromBar = (e: TouchEvent) => down(pos.current >= 0.5 ? 1 : 0)(e)
    const fromSheet = down(1)
    barEl.addEventListener('touchstart', fromBar, { passive: true })
    sheetEl.addEventListener('touchstart', fromSheet, { passive: true })
    for (const el of [barEl, sheetEl]) {
      el.addEventListener('touchmove', move, opts)
      el.addEventListener('touchend', up, opts)
      el.addEventListener('touchcancel', up, opts)
    }
    return () => {
      barEl.removeEventListener('touchstart', fromBar)
      sheetEl.removeEventListener('touchstart', fromSheet)
      for (const el of [barEl, sheetEl]) {
        el.removeEventListener('touchmove', move)
        el.removeEventListener('touchend', up)
        el.removeEventListener('touchcancel', up)
      }
    }
  }, [api, setOpen, list])

  return api
}

const EXPAND_KEY = 'guide-toc-expanded'

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

/**
 * The logo takes you to the very top, the hero photo included, and leaves no #top in the address. From further than two
 * screens down it first jumps to where the page has just risen over the photo (from lg; a screen down below it), and
 * glides only the rest, the photo coming down and, from lg, the Y unfolding: the whole guide flying by in half a second
 * blurred.
 */
function toTop(e: MouseEvent<HTMLAnchorElement>) {
  e.preventDefault()
  history.replaceState(null, '', window.location.pathname + window.location.search)
  const body = document.querySelector<HTMLElement>('[data-guide-body]')
  const near = body && window.matchMedia('(min-width: 64rem)').matches ? body.offsetTop : window.innerHeight
  if (window.scrollY > 2 * window.innerHeight) window.scrollTo({ top: near, behavior: 'instant' })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/** The Материалы overview: each medium's picture right over its ↗ row to the constructor, carrying its anchor; in `MEDIA` order. */
function Carriers({ items }: { items: typeof MEDIA }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      {items.map(c => (
        <div key={c.to} id={c.id} className={`scroll-mt-24 ${isWide(c) ? 'sm:col-span-2' : ''}`}>
          <Constructor to={c.to} title={c.title} label={c.row} flush template={GENERATORS.find(g => g.path === c.to)?.templates?.[0]}>{c.picture}</Constructor>
        </div>
      ))}
    </div>
  )
}

/**
 * Редактор материалов (`/editor`, the guide's quick link «Редактор»): every constructor in a window centred over the guide,
 * dimmed at 40% as under the phone's contents sheet, its corners 16px round as that sheet's. The names as the
 * generators' menu sets them, 24px Medium 20px apart, in its alphabetical order, each in a new tab (`EditorLinks`). A tap on the dim, the cross or Esc
 * closes it: back where you came from, or to the guide itself when the window was opened by its link.
 */
/** Leaving `/editor`: back where you came from, or to the guide itself when it was opened by its link */
function useCloseEditor() {
  const navigate = useNavigate()
  return () => ((window.history.state as { idx?: number } | null)?.idx ? navigate(-1) : navigate('/', { replace: true }))
}

/** Whether the screen is lg or wider, where the guide has its sidebar (below it, the bottom bar and its sheet) */
function useWide() {
  const query = '(min-width: 64rem)'
  const [wide, setWide] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setWide(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return wide
}


/**
 * The constructors as the window and the phone's sheet list them: each opens in a tab of its own, the guide staying
 * where it was; pointed at, the name gets the page links' hairline underline and a ↗ after it, 8 px off (not grey,
 * as the contents)
 */
function EditorLinks() {
  return GENERATORS.map(m => (
    <Link key={m.path} to={m.path} target="_blank" rel="noopener" title={editTitle(m.path)} className="group flex items-center gap-2 text-[24px] font-medium leading-6 tracking-[-0.01em]">
      <span className={`${UNDERLINE} group-hover:decoration-black/40 group-hover:duration-0`}>{m.title}</span>
      <span aria-hidden className="opacity-0 group-hover:opacity-100">↗</span>
    </Link>
  ))
}

function EditorDialog() {
  const close = useCloseEditor()
  return (
    <Dialog title="Редактор материалов" onClose={close}>
      <nav aria-label="Конструкторы" className="flex flex-col items-start gap-5">
        <EditorLinks />
      </nav>
    </Dialog>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Guide() {
  const editor = useLocation().pathname === '/editor'
  const wide = useWide()
  const closeEditor = useCloseEditor()
  const active = useActiveSection()
  const pageRef = useRef<HTMLDivElement>(null)
  useTypograf(pageRef)
  const [expandAll, toggleExpandAll] = useExpandAll()
  const [menuOpen, setMenuOpen] = useState(false)
  // Below lg the bottom bar's sheet holds the contents or, at `/editor`, the constructors (Редактор материалов), as the
  // window from lg; it says which until it's slid away, then goes back to the contents
  const [sheetEditor, setSheetEditor] = useState(false)
  useEffect(() => {
    if (editor && !wide) { setSheetEditor(true); setMenuOpen(true) }
    else if (!editor && sheetEditor && menuOpen) setMenuOpen(false)
  }, [editor, wide]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (menuOpen || !sheetEditor) return
    if (editor) closeEditor()
    const t = window.setTimeout(() => setSheetEditor(false), 360)
    return () => clearTimeout(t)
  }, [menuOpen]) // eslint-disable-line react-hooks/exhaustive-deps
  const asideRef = useRef<HTMLElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  useActiveInView(asideRef, active, expandAll)
  const quickRef = useRef<HTMLElement>(null)
  useHeroStrip(pageRef, quickRef, bodyRef)
  useHeroSnap(bodyRef)
  const tocShown = useHeroReveal(bodyRef, asideRef)
  // The contents row does what it says; on the first screen, where the contents are out of view and it shows
  // the menu bars whatever the list's state, it takes the page up over the photo and opens the list (an expanded one
  // stays so).
  const onTocToggle = () => {
    if (tocShown || !expandAll) toggleExpandAll()
    const top = bodyRef.current?.getBoundingClientRect().top ?? 0
    if (top > 1) window.scrollTo({ top: window.scrollY + top, behavior: 'smooth' })
  }
  // Two headings rarely share a line on a phone; when they do (Видение / Миссия), the first one names the place. On
  // the first screen (the film and the statement, before any section) the bar shows the menu icon alone, the quick
  // links after it, as on wide screens
  const sectionTitle = active.length ? TITLES[active[0]] : undefined

  // The open mobile contents: opened at the chapter you're reading, the page behind kept still, Esc closing it.
  const sheetRef = useRef<HTMLDivElement>(null)
  const toc = useTocSheet(menuOpen, setMenuOpen, sheetRef)
  // The contents' sheet: 60% of the screen over the bar, cut down to whole 36px rows under the list's top padding, so no
  // row stands half under its edge (`--toc-h`)
  useEffect(() => {
    const fit = () => {
      const el = toc.sheet.current
      if (!el) return
      const md = window.matchMedia('(min-width: 48rem)').matches
      const pad = md ? 24 : 16
      const rows = Math.max(4, Math.floor((window.innerHeight * 0.6 - (md ? 68 : 52) - pad) / 36))
      el.style.setProperty('--toc-h', `${pad + rows * 36}px`)
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [toc])
  useEffect(() => {
    if (!menuOpen) return
    toc.reveal()
    const root = document.documentElement
    root.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => {
      root.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen, toc])

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
    // Jump again once the brand font has loaded: the swap from the fallback font changes text heights above the target.
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
      {editor && wide && <EditorDialog />}
      {/* The hero is the top of the page: the logo leads here, and it isn't in the contents. On a phone it's the first
          picture, above the header, and covers the header's upward white (z-30). From lg it's fixed behind the page,
          which starts a strip above the bottom of the screen (`--strip`, see useHeroStrip; 252px for a three-line
          statement), so the first screen shows the logo, the row and the statement, then slides up over the photo. */}
      <Hero bodyRef={bodyRef} />

      <div ref={bodyRef} data-guide-body className="bg-white lg:relative lg:z-10 lg:mt-[calc(100vh-var(--strip,286px))] lg:flex lg:items-start">
      {/* Desktop sidebar. The expand row sits at the bottom of the screen, so it stays put while the open chapter
          changes the list's height, and sticks there when the list is taller than the screen, cutting the list off —
          enough of a hint that it scrolls, so the scrollbar, far from the text at this width, is hidden. */}
      <aside ref={asideRef} className="hidden lg:flex sticky top-0 h-screen w-[320px] xl:w-1/3 shrink-0 flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* The logo's box is the folded wordmark, 120 by 24; the lockup is drawn larger over it and scaled (useHeroReveal). */}
        <div className="sticky top-0 z-10 bg-white p-6"><a href="#top" onClick={toTop} aria-label="В начало" data-logo className="block h-6 w-[120px]"><div data-logo-desk className="origin-top-left will-change-transform"><HeaderLogo title={SITE.name} /></div></a></div>
        {/* The row is fixed to the bottom of the screen — not moved there by script, which lags the scroll a frame and
            makes it shake — so the list keeps its height free at the end. */}
        <div data-logo-nav className="px-6 pb-[68px] will-change-transform"><Nav active={active} expandAll={expandAll} /></div>
        <div className="fixed bottom-0 left-0 z-10 w-[320px] bg-white xl:w-1/3">
          <div data-logo-toggle className="will-change-transform">
            <TocToggle expanded={expandAll && tocShown} onClick={onTocToggle} className="w-full p-6" />
          </div>
        </div>
      </aside>

      {/* Mobile top bar. iOS 26 browsers draw the page under their translucent top bar and stick `top: 0` below it,
          so the white is extended a screen upwards to hide content scrolling above the header. */}
      <header className="lg:hidden sticky top-0 z-20 bg-white p-4 md:p-6 before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-screen before:bg-white before:content-['']">
        <a href="#top" onClick={toTop} aria-label="В начало" className="block w-fit"><HeaderLogo title={SITE.name} /></a>
      </header>

      {/* Mobile table of contents: a bar at the bottom names the heading you're reading and stands in for the
          sidebar; tapped, the full contents open between the header and the bar, which turns into «Свернуть». */}
      <div className="lg:hidden">
        {/* A sheet from the bottom, 60% of the screen cut down to whole 36px rows (`--toc-h`), its top corners 16 px round, as the voice examples' bubbles' corners, over the page dimmed: every item within a thumb's
            reach, the list scrolling inside it, opened at the chapter you're reading (it took the whole screen under the
            header, its top items out of reach). A tap on the page above closes it, as «Свернуть» does */}
        <div ref={toc.dim} aria-hidden className="invisible fixed inset-0 z-40 bg-black/40 opacity-0" onClick={() => setMenuOpen(false)} />
        {/* One bar at the foot, the sheet's own when it's open: the list comes out from behind it and goes back there,
            and the bar says «Свернуть». The whole bar toggles the contents (the button's ::before covers it), save the
            quick links standing in it on the first screen. As with the header, the bar's white runs a screen on past
            its bottom: iOS 26 Safari draws the page under its floating toolbar, and while that slides the bar's bottom
            edge lets the page show through. The white below and the list above both overlap the bar by 2px, so no seam
            opens on a fractional pixel. */}
        {/* A white border as tall as the bar runs on under it, past the screen's bottom, where the page would show through
            under iOS 26 Safari's floating toolbar as it slides. */}
        <div className="fixed inset-x-0 -bottom-[52px] z-40 border-b-[52px] border-white md:-bottom-[68px] md:border-b-[68px]">
          <div ref={toc.sheet} inert={!menuOpen || undefined} className={`invisible absolute inset-x-0 bottom-[calc(100%-2px)] flex flex-col overflow-hidden rounded-t-2xl bg-white ${sheetEditor ? 'max-h-[calc(80dvh-52px)] md:max-h-[calc(80dvh-68px)]' : 'h-(--toc-h)'}`}>
            {/* The list's top padding is inside it, so a stuck title is measured from the sheet's edge in every browser. */}
            <div ref={sheetRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 md:px-6">
              {sheetEditor ? (
                // The editor's window set in the sheet: its title, the constructors 24 Medium 20 apart under it; the sheet
                // as tall as they are (the contents' eleven rows left it a gap under them), 80% of the screen at most
                <div className="flex flex-col gap-6 pt-4 pb-4 md:pt-6 md:pb-6">
                  <p className="font-medium">Редактор материалов</p>
                  <nav aria-label="Конструкторы" className="flex flex-col items-start gap-5">
                    <EditorLinks />
                  </nav>
                </div>
              ) : (
                <div className="pt-4 md:pt-6"><Nav active={active} expandAll onNavigate={() => setMenuOpen(false)} stickyChapters /></div>
              )}
            </div>
          </div>
          <div ref={toc.bar} className="relative z-10 flex items-start gap-4 bg-white after:pointer-events-none after:absolute after:inset-x-0 after:top-[calc(100%-2px)] after:h-screen after:bg-white after:content-[''] md:gap-6 px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] text-[16px] font-medium leading-[1.25] tracking-[-0.01em] md:px-6 md:pt-6 md:pb-[max(24px,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => { if (!menuOpen) setSheetEditor(false); setMenuOpen(!menuOpen) }}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Свернуть' : sectionTitle ? `Содержание: ${sectionTitle}` : 'Содержание'}
              className="flex min-w-0 cursor-pointer items-start gap-2 text-left before:absolute before:inset-0 before:content-['']"
            >
              <TocIcon name={menuOpen ? 'close' : 'menu'} />
              {/* On the first screen the icon alone, the quick links 8px after it, as a label stands after its icon */}
              {(menuOpen || sectionTitle) && <span className="min-w-0 truncate">{menuOpen ? 'Свернуть' : sectionTitle}</span>}
            </button>
            {/* The quick links until the first section's heading is lit, then at once the section's name in their place */}
            {!menuOpen && !sectionTitle && <BarLinks />}
          </div>
        </div>
      </div>

      {/* 16px on top from lg: the statement's capitals then stand level with the top of the logo beside it. */}
      <main className="min-w-0 flex-1 p-4 pb-[calc(52px+1rem)] md:p-6 md:pb-[calc(68px+1.5rem)] lg:pt-4 lg:pb-6">
        <div className="flex flex-col gap-section">
          {/* The statement under the hero, the brand's descriptor (Коммуникация → Дескрипторы), standing as the cover's line,
              then Платформа бренда with a title of its own as every chapter (the statement stood in for it). */}
          <div>
            <div className="flex flex-col">
              {/* From lg the statement is 60px in the 912px Figma column and scales with the column below that
                  (6.58cqw), so it wraps the same three lines at any width. Its capitals stand level with the top of
                  the logo: the body's 16px on top, plus 8px less the brand font's 0.164em above the caps. */}
              <div className="flex flex-col gap-8 md:gap-12 lg:[container-type:inline-size]">
                <p id="statement" className="text-[32px] font-medium leading-none tracking-[-0.01em] md:text-[48px] lg:mt-[calc(8px-0.164em+var(--logo-overhang,0px))] lg:max-w-[912px] lg:text-[min(60px,6.58cqw)]">
                  {STATEMENT}
                </p>
                {/* Quick links: read (Платформа бренда), see (Материалы, the templates there too), make (Редактор, the
                    constructors' window, titled «Редактор материалов»; «Редактор» alone after Материалы, with no echo). They
                    were Платформа and Материалы для дилеров, then Носители and Печатные материалы, then no Материалы */}
                {/* From lg only: below it they stand in the bottom bar beside the menu icon (BarLinks) */}
                <nav aria-label="Быстрые ссылки" ref={quickRef} className="flex max-lg:hidden flex-wrap gap-x-6 gap-y-2 text-[16px] font-medium leading-[1.25] tracking-[-0.01em]">
                  <a href="#brand" className={LINK_HOVER}>Платформа бренда</a>
                  <a href="#materials" className={LINK_HOVER}>Материалы</a>
                  <Link to="/editor" className={LINK_HOVER}>Редактор</Link>
                </nav>
              </div>
            </div>
          </div>

          <Chapters />

          {/* ── Материалы ── */}
          <Chapter id="materials" title="Материалы">
            <Section>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 *:max-w-none">
                <Text>
                  {/* Every generator, from the generators' list: in `INTRO_ORDER`, a new one after them */}
                  <p>{`${MATERIALS_LEAD} `}{INTRO.map((g, i) => (
                    <Fragment key={g.path}>{i === 0 ? '' : i === INTRO.length - 1 ? ' и\u00a0' : ', '}<Link to={g.path} title={editTitle(g.path)} className={TEXT_LINK}>{g.phrase}</Link></Fragment>
                  ))}.</p>
                </Text>
                <Text>
                  <p>Каждый материал собирается в{'\u00a0'}<Link to="/editor" className={TEXT_LINK}>редакторе</Link>: введите свои данные и получите файлы, готовые к печати или производству. Если нужно больше свободы, скачайте шаблон.</p>
                </Text>
              </div>
              <Carriers items={MEDIA} />
            </Section>
          </Chapter>

          {/* ── Контакты ── CONTACT stands for the brand contact until there is one.
              The last chapter and the footer take at least two thirds of the screen, counted from the chapter's anchor
              down to the page's bottom padding (68, 92 from md, 24 from lg): just enough for its heading to reach the
              upper third, where the contents light it, however short it is. */}
          <div className="flex min-h-[calc(66.7svh+8px-68px+var(--spacing-chapter)-var(--spacing-section))] flex-col gap-section md:min-h-[calc(66.7svh+8px-92px+var(--spacing-chapter)-var(--spacing-section))] lg:min-h-[calc(66.7svh+8px-24px+var(--spacing-chapter)-var(--spacing-section))]">
            <Chapter id="contact" title="Контакты">
              <Section>
                <Contact />
              </Section>
            </Chapter>

            <footer className="mt-auto text-[16px] leading-[1.25] tracking-[-0.01em] text-caption">{FOOTER}</footer>
          </div>
        </div>
      </main>
      </div>
    </div>
  )
}
