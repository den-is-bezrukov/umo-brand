import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ResetIcon, DuplicateIcon, TrashIcon, PlusIcon, Removed, type Staff } from '@/ui/staff'
import { InSlide, InFoot, InSheet, SheetLayer } from '@/ui/phone'
import { addTitle, itemName } from '@/data/generators'

// A trial of the generators' phone layout (Figma 5098:5806, «Mobile Layout»): the canvas over a sheet holding the
// sidebar (header and form) with the download at its foot. A list's pictures are swiped one at a time, with a row over
// them: delete (its place kept empty while «Удаляем · Вернуть» has its own bin), «‹ ↺ n/total ⧉ ›» (a slide that isn't an item: its name), add; one portrait picture has its reset, copy and add in the canvas's top corners instead, a landscape one a row with its name. A tap on
// a picture that would grow by it, or a swipe down, lowers the sheet to its header (a portrait one: a landscape one is
// as wide either way); a swipe on the header or a pull past the form's edge opens the form over the whole screen or
// puts it back.
// In the link: `arrows=0` hides the arrows (swiping alone)

/** Whether the screen is a phone's, as the generators' `md` breakpoint */
export function usePhone() {
  const query = '(max-width: 767px)'
  const [phone, setPhone] = useState(() => matchMedia(query).matches)
  useEffect(() => {
    const m = matchMedia(query)
    const on = () => setPhone(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return phone
}

const TURN_MS = 500
/** The sheet's share of the screen under the picture */
const HALF_SHARE = 0.6
/** A picture's inset in the canvas: 10 px of padding and 10 more beside it, over and under it (Figma 5105:8456) */
const SIDE = 20
const INSET = 10
/** Off the sides with the controls in the canvas's top corners: past them (10 + 30) and 10 more; 30 more with copy and add both in the right one */
const CORNER = 50
/** The canvas's padding and its rows' height (Figma 5105:8488) */
const ROW = 30
const PAD = 10
/** A field lifted for typing stands this far under the sheet's top: its group's 24 px padding, label and 12 px to it */
const LIFT = 52
/** The hold that takes the sheet runs this far under the generators' line, from the canvas's top */
const GRAB_UNDER = 20
/** The download's pace going down with the sheet */
const FOOT_PACE = 0.5
/** How much the sheet gives past its last place under a finger */
const SPRING = 0.3
/** A sheet let go goes on, slowing down */
const LET_GO = { duration: 350, easing: 'cubic-bezier(0.2, 0, 0, 1)' }

const arrowsOn = () => new URLSearchParams(location.search).get('arrows') !== '0'

const ICON = { fill: 'none', stroke: 'currentColor', strokeWidth: 1, strokeLinecap: 'square' as const, strokeLinejoin: 'bevel' as const }

function Btn({ label, name, onClick, hidden, children }: { label: string; name?: string; onClick: () => void; hidden?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={name ?? label}
      onClick={onClick}
      // 30 px as in Figma, a finger's 40 round it (the ::after); hidden keeps its place, so the others don't move
      className={`relative flex size-[30px] shrink-0 after:absolute after:-inset-[5px] after:content-[''] cursor-pointer items-center justify-center rounded-[8px] text-[#808080] active:text-black ${hidden ? 'invisible' : ''}`}
    >
      {children}
    </button>
  )
}

export interface Slide {
  key: string | number
  /** The picture, or a function drawing it at a width (the price card's, sized in pixels) */
  node: React.ReactNode | ((width: number) => React.ReactNode)
  /** The picture's height to its width, to fit it whole; without one it takes the width and scrolls if taller */
  ratio?: number
  /** The list item it is, for the actions and the selection */
  item?: number
  /** Its number, when it isn't its place in the strip (the business card's face is 0, its cards from 1) */
  number?: number
  /** Its name: over one picture, or after its number in a row of slides that aren't items («1/Левый борт») */
  label?: string
  /** Its reset, in «Сбросить»'s place, while there's something to reset */
  reset?: { onClick: () => void; label: string }
}

type Sheet = 'preview' | 'half' | 'full'
/** Where the sheet stood on the last generator, for the next one */
let keptSheet: Sheet = 'half'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function MobileEditor({ slides, staff, onAdd, sidebar, download }: {
  slides: Slide[]
  /** A list's pages: the selected item shown, a swipe selecting the next */
  staff?: Staff<any> // eslint-disable-line @typescript-eslint/no-explicit-any
  /** «Добавить», the manual list only: a new item right after the one shown, as the plus in its column on wide screens */
  onAdd?: (after?: number) => void
  sidebar: React.ReactNode
  download: React.ReactNode
}) {
  // Another generator picked on the line opens with the sheet where it stood (it opened at 60% each time)
  const [sheet, setSheet] = useState<Sheet>(() => keptSheet)
  useEffect(() => { keptSheet = sheet }, [sheet])
  const scroller = useRef<HTMLDivElement>(null)
  const sheetRef = useRef(sheet)
  sheetRef.current = sheet
  /** Where the sheet came from and how far its form was scrolled, to carry the form on from there */
  const from = useRef<{ sheet: Sheet; top: number; at?: number; now?: boolean } | null>(null)
  /** To another place; `at`, where a finger left the sheet, to go on from there; `now`, at once, not moving */
  const move = (s: Sheet, at?: number, now?: boolean) => {
    if (s === sheetRef.current) return
    from.current = { sheet: sheetRef.current, top: scroller.current?.scrollTop ?? 0, at, now }
    setSheet(s)
  }
  const [arrows] = useState(arrowsOn)
  // A text field in the form has the focus, so the keyboard is up: the download steps aside, as a phone's own forms do,
  // or it covered the field the keyboard had just brought above it
  const [typing, setTyping] = useState(false)
  const types = (el: EventTarget | null) => el instanceof HTMLTextAreaElement ? !el.readOnly : el instanceof HTMLInputElement && !el.readOnly && !['checkbox', 'radio', 'button', 'submit', 'file'].includes(el.type)

  // The slide in view: the selected item's on a list's page
  const selectedAt = staff ? slides.findIndex(s => s.item === staff.selected) : -1
  const [at, setAt] = useState(Math.max(0, selectedAt))
  const shown = Math.min(at, slides.length - 1)
  const item = slides[shown]?.item
  // A loaded table is only looked through, as on wide screens: a swipe selects nothing (selecting took the list to
  // «Вручную»), and its items have no actions
  const browsing = staff?.mode === 'table'
  const current = browsing ? undefined : staff?.items.find((it: { key: number }) => it.key === item)

  // The strip's box, to fit a picture into it whole
  const strip = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = strip.current
    if (!el) return
    const o = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }))
    o.observe(el)
    return () => o.disconnect()
  }, [])

  // Swiping: the slide that comes to rest is shown and, an item, selected; an item selected otherwise (a copy, a
  // removal, the line over the download) comes into view
  const settle = useRef(0)
  const onScroll = () => {
    // The number and arrows follow the swipe at once, the slide past the middle of the screen counting as shown (they
    // waited for it to settle and lagged behind); the item is selected once it has
    const el = strip.current
    if (el?.clientWidth) setAt(Math.round(el.scrollLeft / el.clientWidth))
    clearTimeout(settle.current)
    settle.current = window.setTimeout(() => {
      const el = strip.current
      if (!el || !el.clientWidth) return
      const i = Math.round(el.scrollLeft / el.clientWidth)
      setAt(i)
      const key = slides[i]?.item
      if (staff && !browsing && key !== undefined && key !== staff.selected) staff.pick(key)
    }, 80)
  }
  const scrollTo = (i: number, smooth = true) => {
    const el = strip.current
    if (!el || !el.clientWidth) return
    const want = i * el.clientWidth
    if (Math.abs(el.scrollLeft - want) > 2) el.scrollTo({ left: want, behavior: smooth ? 'smooth' : 'auto' })
  }
  useEffect(() => {
    if (selectedAt >= 0 && selectedAt !== at) { setAt(selectedAt); scrollTo(selectedAt) }
  }, [selectedAt, slides.length]) // eslint-disable-line react-hooks/exhaustive-deps
  // A turned or resized screen keeps the slide in place at once
  useEffect(() => scrollTo(shown, false), [box.w]) // eslint-disable-line react-hooks/exhaustive-deps
  const go = (d: number) => {
    const i = Math.min(Math.max(shown + d, 0), slides.length - 1)
    setAt(i)
    scrollTo(i)
    const key = slides[i]?.item
    if (staff && !browsing && key !== undefined) staff.pick(key)
  }

  // A tap on the picture folds or unfolds the sheet; a double tap is left to the picture (text edited in place), and a
  // tap on a control in it to the control
  const tap = useRef(0)
  const onTap = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('button[aria-label], input, textarea, a')) return
    clearTimeout(tap.current)
    if (e.detail > 1) return
    tap.current = window.setTimeout(() => move(sheetRef.current === 'preview' ? 'half' : 'preview'), 250)
  }

  // The form's header (menu, crumbs, the generators' line; no grabber) takes the sheet along with the finger, as a
  // phone's own sheets: let go, it goes on to the place nearest to where it was let go (no flick); past the
  // last place it gives only a little, as a spring. Over the whole screen only a form longer than the sheet goes.
  // Was a pull past the form's edge (it rode on the form's own spring, which pulled it off the sheet's edge), the
  // scroll reaching the end opening it, an icon in the header, a grabber on the sheet's edge before it, and the sheet
  // following a finger anywhere on the form, which jerked and moved the picture
  /** Whether the form is longer than the sheet, when the finger came down */
  const pull = useRef<{ long: boolean } | null>(null)
  /** The sheet under the finger: where it started and is, where the finger started, and which way it went first */
  const drag = useRef<{ base: number; at: number; x: number; y: number; way?: 'x' | 'y'; down?: boolean } | null>(null)
  /** Takes the sheet where it is, caught on its way or not */
  const take = useRef<() => number>(() => 0)
  // The finger's first move says what it does: up or down it takes the sheet and the form doesn't scroll under it
  // (called off in the gesture itself, so not a React listener, which can't); across, it leaves the sheet to the
  // generators' line or the pictures. Not `touch-action` on the header: the line, a scroll of its own, let the form scroll
  useEffect(() => {
    const el = root.current
    if (!el) return
    const onMove = (e: TouchEvent) => {
      const d = drag.current
      if (!d) return
      if (!d.way) {
        const dx = Math.abs(e.touches[0].clientX - d.x), dy = Math.abs(e.touches[0].clientY - d.y)
        d.way = dy >= dx ? 'y' : 'x'
        if (d.way === 'x') { drag.current = null; return }
        // On the form at its top only a pull down takes the sheet; up, the form scrolls as ever
        if (d.down) {
          if (e.touches[0].clientY <= d.y) { drag.current = null; return }
          d.base = d.at = take.current()
        }
      }
      if (e.cancelable) e.preventDefault()
    }
    el.addEventListener('touchmove', onMove, { passive: false })
    return () => el.removeEventListener('touchmove', onMove)
  }, [])
  // The mouse, in a narrow window, as a finger on the canvas and the header: pressed and moved up or down it takes the
  // sheet, across it leaves it; the click that ends a drag goes nowhere (a crumb or the picture under it took it)
  const mouse = useRef({ grab: (_x: number, _y: number) => {}, follow: (_y: number) => {}, end: () => {} })
  useEffect(() => {
    const el = root.current
    if (!el) return
    const down = (e: MouseEvent) => { if (e.button === 0) mouse.current.grab(e.clientX, e.clientY) }
    const moved = (e: MouseEvent) => {
      const d = drag.current
      if (!d || !(e.buttons & 1)) return
      if (!d.way) {
        const dx = Math.abs(e.clientX - d.x), dy = Math.abs(e.clientY - d.y)
        if (dx + dy < 4) return
        d.way = dy >= dx ? 'y' : 'x'
        if (d.way === 'x') { drag.current = null; return }
      }
      e.preventDefault()
      mouse.current.follow(e.clientY)
    }
    const up = () => {
      if (drag.current?.way === 'y') addEventListener('click', e => { e.stopPropagation(); e.preventDefault() }, { capture: true, once: true })
      mouse.current.end()
    }
    el.addEventListener('mousedown', down)
    addEventListener('mousemove', moved)
    addEventListener('mouseup', up)
    return () => {
      el.removeEventListener('mousedown', down)
      removeEventListener('mousemove', moved)
      removeEventListener('mouseup', up)
    }
  }, [])
  const sheetAt = () => {
    const m = sheetEl.current ? new DOMMatrix(getComputedStyle(sheetEl.current).transform) : null
    return m ? m.m42 : edge[sheetRef.current]
  }
  const onTouchStart = (e: React.TouchEvent) => grab(e.touches[0].clientX, e.touches[0].clientY, false)
  /** A finger or the mouse coming down: on the canvas or the header it takes the sheet, on the form at its edge maybe */
  const grab = (x: number, y: number, mouse: boolean) => {
    // The whole canvas and the header, to 20 px under the generators' line: nothing on the canvas is scrolled up or
    // down (the header alone was too small a hold, then 50 px of the canvas over the sheet's edge)
    const head = scroller.current?.querySelector('[data-head]')?.getBoundingClientRect()
    const el = scroller.current
    pull.current = { long: !!el && el.scrollHeight - el.clientHeight > 1 }
    drag.current = null
    const edgeY = sheetEl.current?.getBoundingClientRect().top ?? 0
    // Over the sheet's edge whatever the form's scroll (its header scrolled away, the list's row over it still holds)
    if (sheetEl.current && (y < edgeY || (head && y <= head.bottom + GRAB_UNDER))) {
      const at = take.current()
      drag.current = { base: at, at, x, y }
    } else if (el && !mouse) {
      // The form at its top: a pull down takes the sheet, as a phone's own sheets (its spring gave instead); decided on
      // the first move, so the sheet isn't stopped by a scroll. Not a pull up at its end, tried with the finger and as
      // a pull past the end set going once let go
      if (el.scrollTop <= 0) drag.current = { base: 0, at: 0, x, y, down: true }
    }
  }
  // Caught on its way, it stops where it is
  take.current = () => {
    const at = sheetAt()
    sheetEl.current?.getAnimations().forEach(a => a.cancel())
    formEl.current?.getAnimations().forEach(a => a.finish())
    place(at)
    return at
  }
  /** The places a finger can take the sheet to */
  // Over the whole screen while it stands there, a short form's too (typing takes it there): left out, the first move
  // threw the sheet to its 60% place as past its last one
  const reach = (long: boolean): Sheet[] => [...(long || sheetRef.current === 'full' ? ['full' as const] : []), 'half', 'preview']
  const onTouchMove = (e: React.TouchEvent) => follow(e.touches[0].clientY)
  /** The sheet under the finger or the mouse */
  const follow = (y: number) => {
    const p = pull.current
    if (!p) return
    const d = drag.current
    if (!d || d.way !== 'y' || !sheetEl.current) return
    const places = reach(p.long).map(s => edge[s])
    const lo = Math.min(...places), hi = Math.max(...places)
    let at = d.base + y - d.y
    if (at < lo) at = lo - (lo - at) * SPRING
    if (at > hi) at = hi + (at - hi) * SPRING
    d.at = at
    place(at)
  }
  const onTouchEnd = () => {
    const p = pull.current
    pull.current = null
    const d = drag.current
    drag.current = null
    if (d?.way === 'y' && p) {
      // Where it was let go, its speed not carrying it on (a flick went on to the next place)
      const aim = d.at
      const to = reach(p.long).reduce((a, b) => (Math.abs(edge[b] - aim) < Math.abs(edge[a] - aim) ? b : a))
      if (to !== sheetRef.current) move(to, d.at)
      else if (sheetEl.current) {
        place(edge[to])
        glide(d.at, edge[to], LET_GO)
      }
    }
  }
  mouse.current = { grab: (x, y) => grab(x, y, true), follow, end: onTouchEnd }
  const onTouchCancel = () => {
    pull.current = null
    if (drag.current) place(edge[sheetRef.current])
    drag.current = null
  }

  const many = slides.length > 1
  const full = sheet === 'full'
  const preview = sheet === 'preview'
  const slide = slides[shown]
  const reset = slide?.reset ?? (staff && current && !staff.isBlank(current) ? { onClick: () => staff.clear(current.key), label: 'Сбросить' } : undefined)
  /** The row over the picture: a list's, or a removal's «Вернуть» right after the last but one went */
  const row = many || !!staff?.removed
  /** One portrait picture (the price card, the sign) has its reset and copy in the canvas's top corners, no row over it,
   * so it takes the canvas's height (Figma 5105:8373); a landscape one keeps the row, the corners being over its edge */
  const corners = !row && (slide?.ratio ?? 0) > 1

  // The page's size, everything laid out by: the page's own box, not the window's (on iOS 26 the page runs on under
  // Safari's floating bar, past `innerHeight`, so the sheet and the canvas missed each other by the bar's height)
  const root = useRef<HTMLDivElement>(null)
  const [screen, setScreen] = useState({ w: innerWidth, h: innerHeight })
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const on = () => setScreen(s => (s.w === el.clientWidth && s.h === el.clientHeight ? s : { w: el.clientWidth, h: el.clientHeight }))
    on()
    const o = new ResizeObserver(on)
    o.observe(el)
    return () => o.disconnect()
  }, [])
  // Lowered, the sheet shows its header alone: the crumbs and the generators' line, 24 px under them as over them,
  // over the screen's bottom safe area (the shrink icon under the picture went)
  const [peek, setPeek] = useState(140)
  useLayoutEffect(() => {
    const head = scroller.current?.querySelector('[data-head]') as HTMLElement | null
    if (!head) return
    const measure = () => {
      const top = scroller.current!.getBoundingClientRect().top - scroller.current!.scrollTop
      const safe = document.createElement('div')
      safe.style.height = 'env(safe-area-inset-bottom)'
      document.body.append(safe)
      setPeek(Math.round(head.getBoundingClientRect().bottom - top + 24 + safe.offsetHeight))
      safe.remove()
    }
    if (!document.documentElement.hasAttribute('data-menu')) measure()
    const o = new ResizeObserver(() => { if (!document.documentElement.hasAttribute('data-menu')) measure() })
    o.observe(head)
    return () => o.disconnect()
  }, [])
  // The generators' menu opened from the lowered sheet raises it, to list them all
  useEffect(() => {
    const o = new MutationObserver(() => { if (document.documentElement.hasAttribute('data-menu') && sheetRef.current === 'preview') move('half') })
    o.observe(document.documentElement, { attributes: true, attributeFilter: ['data-menu'] })
    return () => o.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const back = (
    <Btn label="Назад" hidden={!arrows || !many || shown === 0} onClick={() => go(-1)}>
      <svg width="16" height="16" viewBox="0 0 16 16" {...ICON} aria-hidden><path d="M10 4L6 8L10 12" /></svg>
    </Btn>
  )
  const next = (
    <Btn label="Вперёд" hidden={!arrows || !many || shown === slides.length - 1} onClick={() => go(1)}>
      <svg width="16" height="16" viewBox="0 0 16 16" {...ICON} aria-hidden><path d="M6 4L10 8L6 12" /></svg>
    </Btn>
  )
  const number = slide?.number ?? shown + 1
  // A list's item shows its number of all («2/5»), its name being on it already; a slide that isn't an item its name,
  // after its number only when it has one of its own (the business card's face, «0/Обложка»; the livery's «Левый борт»)
  const total = slides.filter(s => s.item !== undefined).length
  // Screen readers' names of what acts on the item shown, with it and its number («Удалить визитку 2», as `Action`)
  const of = slide?.item !== undefined ? itemName(location.pathname, total > 1 ? number : undefined) : ''
  const resetBtn = <Btn label={reset?.label ?? 'Сбросить'} name={of && `${reset?.label ?? 'Сбросить'} ${of}`} hidden={!reset} onClick={() => reset?.onClick()}><ResetIcon /></Btn>
  const copyBtn = <Btn label="Дублировать" name={of && `Дублировать ${of}`} hidden={!staff || !current} onClick={() => staff?.duplicate(current.key, false)}><DuplicateIcon /></Btn>
  const addBtn = <Btn label={addTitle(location.pathname)} hidden={!onAdd} onClick={() => onAdd?.(current?.key)}><PlusIcon /></Btn>
  // The sheet is always as tall as over the whole screen and moved down out of it (its edge, the white under the form,
  // and the form each a layer moved and cut, which a phone draws without laying the form out again: a sheet changing its
  // height froze on an iPhone, the form laid out on every frame). At 60% the form has as much again under its end, so it
  // scrolls to its end in view
  const tall = Math.max(0, screen.h - (row ? ROW + 2 * PAD : 0))
  const below = Math.max(0, Math.round(tall - screen.h * HALF_SHARE))
  const edge = { preview: tall - peek, half: below, full: 0 }
  // Typing on a phone opens the form over the screen and lifts the field to its top, under its label, so the keyboard
  // coming up finds it in view and iOS leaves the page where it is (it moved the whole page up, the picture and the
  // sheet's top off the screen; following iOS's pan with the page, tried, shrank the picture); the keyboard gone, the
  // sheet goes back where it was. Room enough under the form while typing to lift its last field
  const before = useRef<Sheet | null>(null)
  const lift = useRef<HTMLElement | null>(null)
  /** A field to bring to the sheet's top once it's back in its place */
  const settleOn = useRef<HTMLElement | null>(null)
  /** The field typed in last, and the form's scroll as the keyboard went */
  const typed = useRef<{ field: HTMLElement; top: number } | null>(null)
  const onFocus = (e: React.FocusEvent) => {
    const t = types(e.target)
    setTyping(t)
    if (!t || !matchMedia('(pointer: coarse)').matches) return
    // A combobox's field over the sheet (its list open in `SheetLayer`): the sheet goes up with the keyboard, the form
    // under it staying where it is
    if (!formEl.current?.contains(e.target as Node)) {
      if (before.current === null) before.current = sheetRef.current
      move('full', undefined, true)
      return
    }
    typed.current = { field: e.target as HTMLElement, top: 0 }
    if (before.current === null) before.current = sheetRef.current
    // From field to field the sheet is open already and nothing renders: lifted here, then (it stayed low, and iOS
    // moved the page for it)
    if (sheetRef.current === 'full' && typing) { liftField(e.target as HTMLElement); return }
    lift.current = e.target as HTMLElement
    // At once: iOS looks where the field is as the keyboard comes, and found it low, the sheet still on its way
    move('full', undefined, true)
  }
  const liftField = (field: HTMLElement) => {
    const el = scroller.current
    // At once, as the sheet: a field still on its way read as low too
    if (el) el.scrollTop += field.getBoundingClientRect().top - el.getBoundingClientRect().top - LIFT
  }
  const onBlur = (e: React.FocusEvent) => {
    const t = types(e.relatedTarget)
    if (!t && typed.current) typed.current.top = scroller.current?.scrollTop ?? 0
    setTyping(t)
  }
  // A focused field taken out of the form (the list to «Из таблицы», an item reset or removed) sends no blur, and the
  // download stayed aside for good: after every render, typing is only while a field in the sheet still has the focus
  useLayoutEffect(() => {
    const el = document.activeElement
    if (typing && !(types(el) && sheetEl.current?.contains(el))) setTyping(false)
  })
  // The keyboard gone, the sheet goes back where it was with the field still at its top, under its label (the room
  // under the form going with the keyboard left it anywhere, the field out of sight); the last ones, short of room,
  // at the form's end. The form moves on from where it stood, not from where its scroll was cut short
  useLayoutEffect(() => {
    if (typing || before.current === null) return
    const s = before.current
    before.current = null
    const t = typed.current
    typed.current = null
    const el = scroller.current
    if (!t || !el) { move(s); return }
    if (s !== sheetRef.current) {
      settleOn.current = t.field
      move(s)
      if (from.current) from.current.top = t.top
      return
    }
    liftField(t.field)
    const d = el.scrollTop - t.top
    if (d) formEl.current?.animate([{ transform: `translateY(${d}px)` }, { transform: 'none' }], { duration: TURN_MS, easing: 'cubic-bezier(0.67, 0, 0.33, 1)' })
  }, [typing]) // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const field = lift.current
    lift.current = null
    if (field) liftField(field)
  })
  const sheetEl = useRef<HTMLDivElement>(null)
  /** The layer over the sheet a combobox's list opens in */
  const [layerEl, setLayerEl] = useState<HTMLDivElement | null>(null)
  const canvasEl = useRef<HTMLDivElement>(null)
  /** The canvas over the sheet: down to its 60% place it grows as the sheet goes, the picture with it, at the
   * sheet's own pace under a finger or not (it grew after, in a move of its own); above it it stays (the sheet over the
   * whole screen slides over it: it shrank under the sheet, the picture refitted as it went and jerked) */
  const canvasH = (at: number) => screen.h - tall + Math.min(Math.max(at, edge.half), edge.preview)
  // The canvas is laid out once, as large as the sheet ever leaves it (lowered to its header), and its pictures are scaled to their size for where the sheet is, standing or on its way: drawn anew at
  // every step they shook, and laid out for one place, scaled up past it, they were cut off at the canvas's foot
  const laidH = canvasH(edge.preview)
  /** A picture's scale and shift for the sheet at `at`, from its size laid out */
  const fitAt = (el: HTMLElement, at: number) => {
    const ratio = Number(el.dataset.ratio), side = Number(el.dataset.side), w = el.offsetWidth
    const s = strip.current
    const grow = canvasH(at) - (canvasEl.current?.offsetHeight ?? laidH)
    if (!s) return {}
    // One with no shape of its own (the plate frame's strip, a table's upload) takes what's in view, the upload
    // filling it, the strip in its middle: laid out large, the upload stood its least height and ran under the sheet
    // Above its 60% place, as the sheet rises over the picture, the picture goes down to the screen's middle with it,
    // standing there behind the sheet over the whole screen: past the sheet's 480 px it shows at its sides, even, and
    // not as its top over the sheet's edge (the canvas cut at the sheet's edge, tried, was taken out)
    const rise = edge.half > 0 ? Math.min(1, Math.max(0, (edge.half - at) / edge.half)) : 0
    const middle = rise && (screen.h / 2 - (s.getBoundingClientRect().top + (s.clientHeight + grow) / 2)) * rise
    if (!ratio) return { height: `${Math.max(0, s.clientHeight + grow - 2 * INSET)}px`, transform: `translateY(${middle}px)` }
    if (!w) return {}
    const extra = el.offsetHeight - w * ratio
    const to = Math.max(0, Math.floor(Math.min(s.clientWidth - 2 * side, (s.clientHeight + grow - 2 * INSET - extra) / ratio)))
    return { transform: `translateY(${grow / 2 + middle}px) scale(${to / w})` }
  }
  const fits = () => [...(canvasEl.current?.querySelectorAll<HTMLElement>('[data-fit]') ?? [])]
  /** The sheet at a place, and the pictures with it */
  /** The download goes down with the sheet under its 60% place, at half its pace, out of sight lowered (it went at once) */
  const footEl = useRef<HTMLDivElement>(null)
  const footAt = (at: number) => ({ transform: `translateY(${Math.max(0, at - edge.half) * FOOT_PACE}px)` })
  const place = (at: number) => {
    if (sheetEl.current) sheetEl.current.style.transform = `translateY(${at}px)`
    if (footEl.current) {
      footEl.current.getAnimations().forEach(a => a.cancel())
      Object.assign(footEl.current.style, footAt(at))
    }
    for (const el of fits()) {
      el.getAnimations().forEach(a => a.cancel())
      Object.assign(el.style, fitAt(el, at))
    }
  }
  /** The sheet going from one place to another, the pictures with it */
  const glide = (from: number, to: number, timing: KeyframeAnimationOptions) => {
    sheetEl.current?.animate([{ transform: `translateY(${from}px)` }, { transform: `translateY(${to}px)` }], timing)
    // The pictures' size isn't the sheet's straight line (they stop at the screen's width): steps along the way
    const steps = Array.from({ length: 11 }, (_, i) => from + ((to - from) * i) / 10)
    if (footEl.current) {
      footEl.current.getAnimations().forEach(a => a.cancel())
      footEl.current.animate(steps.map(footAt), timing)
      Object.assign(footEl.current.style, footAt(to))
    }
    for (const el of fits()) {
      el.getAnimations().forEach(a => a.cancel())
      const end = fitAt(el, to)
      el.animate(steps.map(at => fitAt(el, at)), timing)
      Object.assign(el.style, end)
    }
  }
  // Drawn anew (an edit, another slide, the screen turned), each standing picture is scaled for where the sheet is
  useLayoutEffect(() => {
    const at = drag.current?.at ?? edge[sheetRef.current]
    for (const el of fits()) if (!el.getAnimations().length) Object.assign(el.style, fitAt(el, at))
  })
  const formEl = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const was = from.current
    from.current = null
    const el = scroller.current
    if (!was || !el || !sheetEl.current || !formEl.current || was.now) return
    // Lowered, the sheet shows the form's top, its header
    if (sheet === 'preview') el.scrollTop = 0
    if (settleOn.current) { liftField(settleOn.current); settleOn.current = null }
    // The sheet moves; the form in it starts where it stood, however its scroll was cut short by the room under it
    // changing, and settles into the sheet (opened at the form's end the form stays put as the edge rises over it)
    // Let go by a finger, it goes on from there, slowing down
    const timing = was.at === undefined ? { duration: TURN_MS, easing: 'cubic-bezier(0.67, 0, 0.33, 1)' } : LET_GO
    const start = was.at ?? edge[was.sheet]
    place(edge[sheet])
    glide(start, edge[sheet], timing)
    const lag = el.scrollTop - was.top
    if (lag) formEl.current.animate([{ transform: `translateY(${lag}px)` }, { transform: 'none' }], timing)
  }, [sheet]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    // The page's background is the canvas's; over it the picture with its row, over all the sheet, and the download at
    // the screen's foot over the sheet; clipped, not hidden, so nothing scrolls it (a focused control in the sheet
    // scrolled it by 83 px, the canvas off its place)
    <div ref={root} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchCancel} className="fixed inset-0 overflow-clip bg-[#f5f5f5] font-sans text-black">
      {/* The canvas, 10 px in (Figma 5105:8488): above the sheet at 60%, the whole screen with the picture alone. The
          sheet over the whole screen slides over it, leaving it as it is (it shrank under the sheet, the picture refitted
          as it went and jerked) */}
      <div
        ref={canvasEl}
        className="relative flex flex-col p-[10px]"
        style={{ height: laidH }}
      >
      {/* A list's row over the picture (Figma 5105:7604): delete on the left, add on the right, at the row's ends; between
          them the number between the arrows, the reset before it and copy after it, what acts on the item shown round
          its number (none kept in place: the number and copy centred together while there's nothing to reset); for a
          moment after a removal «Удаляем · Вернуть» in the middle. Over the whole-screen form it's all there is of the
          canvas, its actions kept */}
      {row && (
        <div className="flex h-[30px] shrink-0 items-center justify-between">
          <Btn label="Удалить" name={of && `Удалить ${of}`} hidden={!staff || !current || staff.people.length < 2 || !!staff.removed} onClick={() => staff?.remove(current.key)}><TrashIcon /></Btn>
          {staff?.removed ? (
            <div className="-my-[5px] min-w-0 flex-1"><Removed staff={staff} at={staff.removed.index} /></div>
          ) : (
            <div className="flex min-w-0 flex-1 items-center justify-center">
              {back}
              {reset && resetBtn}
              <span className="min-w-0 truncate px-1 text-[14px] leading-5 text-[#808080] [font-feature-settings:'case'_1,'lnum'_1,'tnum'_1]">
                {slide?.item !== undefined ? `${number}/${total}` : slide?.number !== undefined ? `${number}/${slide.label}` : slide?.label}
              </span>
              {staff && current && copyBtn}
              {next}
            </div>
          )}
          {addBtn}
        </div>
      )}

      {/* One picture: a row over it as a list's, the reset before its name, copy after it, add on the right (in the
          canvas's top corners over the strip, Figma 5105:8373, they covered a landscape item's edge, and the name stood
          in a caption under the picture, unlike a list's) */}
      {/* Only with something in it: empty (a table's upload), it stood over it as a strip of the canvas */}
      {!row && !corners && ((slide?.label && slide.item === undefined) || reset || (staff && current)) && (
        <div className="flex h-[30px] shrink-0 items-center justify-between">
          <Btn label="" hidden onClick={() => {}}>{null}</Btn>
          {/* Only what's there: the reset, the name and copy centred together, no place kept */}
          <div className="flex min-w-0 flex-1 items-center justify-center">
            {reset && resetBtn}
            {slide?.label && slide.item === undefined && <span className="min-w-0 truncate px-1 text-[14px] leading-5 text-[#808080] [font-feature-settings:'case'_1,'lnum'_1,'tnum'_1]">{slide.label}</span>}
            {staff && current && copyBtn}
          </div>
          {addBtn}
        </div>
      )}

      {corners && (
        <>
          <div className="absolute top-[10px] left-[10px]">{reset && resetBtn}</div>
          <div className="absolute top-[10px] right-[10px] flex">{staff && current && copyBtn}{onAdd && addBtn}</div>
        </>
      )}

      {/* The pictures, one to a screen; a tap on one that grows by it folds the sheet away */}
      <InSlide.Provider value={true}>
        <div
          ref={strip}
          onScroll={onScroll}
          onClick={onTap}
          // Across the whole screen, for the swipe, the picture inset in each slide
          className="-mx-[10px] flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {slides.map(s => (
            // A fitted picture's slide doesn't scroll at all (`clip`, not `hidden`, which still let the list's scrollIntoView
            // move a copy 4 px down and cut its top edge); one taller than the screen's width scrolls. A sheet's caption
            // goes, its name in the row
            <div key={s.key} className={`flex h-full w-full shrink-0 snap-center ${s.ratio ? 'overflow-clip' : 'overflow-y-auto [scrollbar-width:none]'} ${s.label ? '[&_figcaption]:hidden' : ''}`}>
              {box.w > 0 && <Fitted ratio={s.ratio} box={box} node={s.node} side={corners ? CORNER + (onAdd ? 30 : 0) : SIDE} />}
            </div>
          ))}
        </div>
      </InSlide.Provider>

      </div>

      {/* The sheet: the sidebar scrolling, 24 px in, as the sidebar on wide screens (Figma has 16; 20 was tried); its top
          corners 24 px round, as its padding (Figma has none), a shadow over it (Figma 5098:5487). Always as tall as over
          the whole screen and moved down out of it, never resized: a sheet changing its height froze on an iPhone, laying
          the form out on every frame. The form painted within it: iOS drew the generators' line, a scroll of its own, and
          its fades over the sheet's edge */}
      <div
        ref={sheetEl}
        // Its shadow off while it's at the page's top, over the whole screen with no list row: it had nowhere to fall and
        // read as cut off. Fixed to the screen of its own, its foot always at the screen's bottom, so Safari 26 carries
        // its white under its floating bar (it carried the page's grey, the page being the fixed box there). At most 480 px
        // wide, centred: wider, on a folded-out phone or an iPad mini, its fields ran to 700 px for a name
        className={`fixed inset-x-0 bottom-0 mx-auto flex max-w-[480px] flex-col rounded-t-[24px] bg-white ${full && !row ? '' : 'shadow-[0_10px_30px_rgba(0,0,0,0.1)]'}`}
        style={{ height: tall, transform: `translateY(${edge[sheet]}px)` }}
      >
        {/* The grabber, the sign a phone's sheets carry that they're dragged (the hold is the whole canvas and the header,
            not it): a quarter of the sheet wide and 2 px thick, 8 px over the edge, on the canvas, going with the sheet (it was in it, under the edge); none
            over the whole screen */}
        {!full && <span aria-hidden className="pointer-events-none absolute -top-2.5 left-1/2 h-0.5 w-1/4 -translate-x-1/2 rounded-full bg-black/10" />}
        <div ref={scroller} data-sheet onFocus={onFocus} onBlur={onBlur} // Always a scroll: switched off lowered, iOS laid the form's layers anew as the finger let go, and the generators'
          // line's fades went for a frame (lowered, a finger on the header takes the sheet anyway)
          className="min-h-0 flex-1 overflow-y-auto rounded-t-[24px] [contain:paint]">
          {/* Groups 24 px apart (`src/index.css`, as on wide screens), so from one 48 px control to the next is 48 (16 + 8
              for a label + 24); at 60% as much again under the form's end as is under the screen, to scroll it into view */}
          <div ref={formEl} className="*:gap-6! *:p-6!" style={{ paddingBottom: `calc(${96 + (typing ? screen.h : full ? 0 : below)}px + env(safe-area-inset-bottom))` }}>
            <SheetLayer.Provider value={{ el: layerEl, hidden: edge[sheet] }}>
              <InSheet.Provider value={sheet}>{sidebar}</InSheet.Provider>
            </SheetLayer.Provider>
          </div>
        </div>
        {/* A combobox's list, over the form within the sheet's round top, as large as the sheet shows; marked as the sheet,
            so its controls are the sheet's 48 px */}
        <div ref={setLayerEl} data-sheet className="absolute inset-0 overflow-hidden rounded-t-[24px] empty:hidden" />
      </div>

      {/* The download over the form's foot, on a white gradient the form fades under, 24 px in all round (Figma 5098:5539),
          plus the screen's bottom safe area under it (`viewport-fit=cover` in index.html), so it clears the home
          indicator. Tried closer to Safari's bottom tab bar: 16, then on iOS alone 16, 0, 2 and 8 — touching the edge,
          the black button turned Safari 26's bar black, and 24 all round is what the sheet's sides have */}
      {!typing && (
        <div ref={footEl} data-sheet style={footAt(edge[sheet])} className="fixed inset-x-0 bottom-0 mx-auto max-w-[480px] [:root:has([data-combo])_&]:hidden bg-gradient-to-b from-white/0 to-white px-6 pt-6 pb-[calc(24px+env(safe-area-inset-bottom))] tracking-normal">
          <InFoot.Provider value={() => { if (sheetRef.current === 'preview') move('half') }}>{download}</InFoot.Provider>
        </div>
      )}
    </div>
  )
}

/**
 * A picture as large as the strip allows, 20 px off its sides and 10 over and under (the items' 1 px edge
 * stays in, however the strip's height rounds), along with what stands under it — an item's faults, a sheet's caption —
 * measured, so they're never cut off by the sheet
 */
function Fitted({ ratio, box, node, side }: { ratio?: number; box: { w: number; h: number }; node: Slide['node']; side: number }) {
  const ref = useRef<HTMLDivElement>(null)
  // The height beyond the picture's own
  const [extra, setExtra] = useState(0)
  const w = ratio
    ? Math.max(0, Math.floor(Math.min(box.w - 2 * side, (box.h - 2 * INSET - extra) / ratio)))
    : Math.max(0, box.w - 2 * side)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !ratio) return
    const measure = () => {
      const c = Math.max(0, Math.round(el.offsetHeight - w * ratio))
      setExtra(e => (Math.abs(c - e) > 1 ? c : e))
    }
    measure()
    const o = new ResizeObserver(measure)
    o.observe(el)
    return () => o.disconnect()
  }, [w, ratio])
  // With no shape of its own, at the top of what's in view, as tall as it (set by `fitAt`), its content in the middle and
  // no taller than it: the upload's least height (240) ran past it on a shorter screen, its edge under the status bar
  return <div ref={ref} data-fit data-ratio={ratio ?? 0} data-side={side} className={ratio ? 'm-auto' : 'mx-auto mt-[10px] flex shrink-0 flex-col justify-center *:min-h-0!'} style={{ width: w }}>{typeof node === 'function' ? node(w) : node}</div>
}
