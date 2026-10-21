import { createContext, isValidElement, useContext, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Art } from '@/pricecard/card'
import Wordmark from '@brand/Wordmark'
import { images } from '@brand/guide/images'
import { editTitle } from '@/data/generators'
import { SITE } from '@/site'
import { modelOf } from '@/data/models'

// The guide's building blocks: a chapter and its sections, text, figures, the download rows, the colour tiles, the
// dictionary. The core's; the brand's guide (`@brand/guide`) is written with them.

/** A picture of the brand's guide by its name (`@brand/guide/images`): SVG for schemes, WebP for photos */
export const img = (name: string) => images[`./images/${name}.svg`] ?? images[`./images/${name}.webp`]

/** A medium of Материалы drawn for the guide: its picture over the row to its generator (`to`), `row` what's done there */
export type Medium = { id: string; to: string; title: string; row: string; w: number; h: number; picture: ReactNode }

/**
 * Links in the page (the quick links, download rows and captions) stay black and get a hairline underline as set in
 * Black at 40%, 2.5% of the type size thick, 25% of it under the baseline, through the descenders.
 * It shows at once and fades over 0.25s: it's always there, transparent until hovered. `UNDERLINE` is the line;
 * `LINK_HOVER` shows it on the link's own hover, rows show it on the row's (`group-hover`).
 */
export const UNDERLINE = 'underline decoration-transparent decoration-[2.5%] underline-offset-[25%] [text-decoration-skip-ink:none] transition-[text-decoration-color] duration-250 ease-[ease]'
export const LINK_HOVER = `${UNDERLINE} hover:decoration-black/40 hover:duration-0`

// ─── Typography ──────────────────────────────────────────────────────────────

/**
 * Chapter: the title, then the chapter's sections. The title is 8 of 12 columns wide, `full` lets it span the whole
 * grid. The anchor `id` sits on an empty marker above the title, so links land on the chapter's very start and the
 * active-chapter tracking sees it begin there.
 * `loose` puts section spacing between title and content, for chapters whose title isn't followed by body copy.
 */
export function Chapter({ id, title, full, loose, children }: {
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

export function H2({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3 id={id} className="scroll-mt-24 text-[24px] md:text-[32px] font-medium leading-none tracking-[-0.01em]">
      {children}
    </h3>
  )
}

/** Characters of text in a React tree. */
export function textLength(node: ReactNode): number {
  if (typeof node === 'string' || typeof node === 'number') return String(node).length
  if (Array.isArray(node)) return node.reduce((n: number, c: ReactNode) => n + textLength(c), 0)
  if (isValidElement<{ children?: ReactNode }>(node)) return textLength(node.props.children)
  return 0
}

/**
 * Body copy. Its width on the 12-column Figma grid follows from how much text there is: up to 150 characters
 * (a line or two) 6 columns, up to 300 — 8, longer — 9, so short notes don't stretch thin and long copy doesn't
 * stand as a tall column. Texts paired side by side (Кобрендинг, Фотография) fill their grid cells instead —
 * their grid sets `*:max-w-none`.
 */
/** `wide`: 9 columns whatever the length (Контакты: three lines instead of four) */
export function Text({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const n = textLength(children)
  const width = wide || n > 300 ? 'max-w-[678px]' : n <= 150 ? 'max-w-[432px]' : 'max-w-[600px]'
  return (
    <div className={`${width} flex flex-col gap-3 text-[18px] md:text-[20px] leading-[1.25] tracking-[-0.01em]`}>
      {children}
    </div>
  )
}

export function Caption({ children, cross, download }: { children: ReactNode; cross?: boolean; download?: boolean }) {
  return (
    <figcaption className="flex items-start gap-2 text-[14px] leading-[1.43] [font-feature-settings:'case'_1]">
      {/* A download's: no ↓ before it, as the rows; ↓ after it, 8 px off, while the picture or caption is pointed at */}
      {download ? (
        <span className="flex-1">
          <span className={`${UNDERLINE} group-hover:decoration-black/40 group-hover:duration-0`}>{children}</span>
          <span aria-hidden className="ml-2 hidden font-medium group-hover:inline">↓</span>
        </span>
      ) : <span className="flex-1">{children}</span>}
      {cross && <span aria-label="нельзя" className="w-4 text-center text-[20px] leading-[1.13] text-[#e30]">×</span>}
    </figcaption>
  )
}

/** Whether a picture is a landscape photo that goes 4:3 on phones: 2:1 and wider, raster (schemes are SVG and stay whole). */
export const isWidePhoto = (name: string, w: number, h: number) => w / h >= 2 && !img(name)?.endsWith('.svg')

/**
 * One exported Figma frame. `w`/`h` are the frame's 1x size in the 1440px layout and set the aspect ratio. Below 640 px
 * (`sm`) a landscape photo (`isWidePhoto`) is cropped to 4:3, as a 2:1 strip 343px wide is too thin; `focus` is the crop's
 * horizontal point in % (default the centre). An object on a flat background (`flat`, that background's colour) isn't
 * cropped — it is fitted into the 4:3 frame whole, the frame filled with its colour. `href` makes the whole figure a download link, its caption led by ↓
 * like the rows of `Assets`.
 */
export function Fig({ name, w, h, alt = '', eager, caption, cross, href, focus = 50, flat, phone43, className = '' }: {
  name: string; w: number; h: number; alt?: string; eager?: boolean; caption?: ReactNode; cross?: boolean; href?: string; focus?: number; flat?: string
  /** A scheme fitted whole into 4:3 on phones, on its grey, as the logo plate above it (the clear space) */
  phone43?: boolean; className?: string
}) {
  const wide = isWidePhoto(name, w, h) || !!phone43
  const figure = (
    <figure className={`flex flex-col gap-3 ${href ? '' : className}`}>
      <img
        src={img(name)}
        alt={alt}
        width={w * 2}
        height={h * 2}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className={`block h-auto w-full bg-surface ${wide ? `aspect-4/3 ${flat || phone43 ? 'object-contain' : 'object-cover'} min-[520px]:aspect-(--ratio)` : ''}`}
        style={wide ? ({ '--ratio': `${w} / ${h}`, objectPosition: `${focus}% 50%`, ...(flat && { background: flat }) } as CSSProperties) : { aspectRatio: `${w} / ${h}` }}
      />
      {caption && <Caption cross={cross} download={!!href}>{caption}</Caption>}
    </figure>
  )
  return href ? <a href={href} download title={`Скачать ${formatOf({ file: href })}`} className={`group block ${className}`}>{figure}</a> : figure
}

/**
 * Flat background with the wordmark centred on it — built from the logo SVG rather than an exported picture.
 * `w`/`h` set the aspect ratio (1x frame size in Figma), `logo` is the wordmark width in the same units.
 */

export function LogoPlate({ w, h, logo, bg, dark, caption, phone43, className = '' }: {
  w: number; h: number; logo: number; bg: string; dark?: boolean; caption?: ReactNode
  /** 4:3 on phones, the logo keeping its share of the width (the Логотип figure) */
  phone43?: boolean; className?: string
}) {
  return (
    <figure className={`flex flex-col gap-3 ${className}`}>
      <div
        className={`flex items-center justify-center ${dark ? 'text-white' : 'text-black'} ${phone43 ? 'aspect-4/3 min-[520px]:aspect-(--ratio)' : ''}`}
        style={{ ...(phone43 ? { '--ratio': `${w} / ${h}` } : { aspectRatio: `${w} / ${h}` }), background: bg } as CSSProperties}
      >
        <div style={{ width: `${(logo / w) * 100}%` }}>
          <Wordmark title={`Логотип ${SITE.name}, ${dark ? 'белый' : 'чёрный'}`} className="w-full" />
        </div>
      </div>
      {caption && <Caption>{caption}</Caption>}
    </figure>
  )
}

/**
 * A brand colour (`@brand/colors`) as a tile with its values printed on it, as the logo schemes carry their measures: the name at the
 * top, each value at the bottom on one line with a short label (where it's used), as the download rows. Codes copy on a click. `dark` sets the text
 * white; a white tile gets a hairline edge, or it would vanish into the page.
 */
export function Swatch({ color, name, values, dark, className = '' }: {
  color: string; name: string; values: [string, string][]; dark?: boolean; className?: string
}) {
  return (
    <div
      className={`flex flex-col justify-between gap-3 p-6 text-[16px] leading-[1.25] tracking-[-0.01em] ${dark ? 'text-white' : 'text-black'} ${color === '#ffffff' ? 'shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)]' : ''} ${className}`}
      style={{ background: color }}
    >
      <p className="text-[18px] md:text-[20px] font-medium leading-[1.25]">{name}</p>
      <div className="flex flex-col gap-2">
        {values.map(([use, value]) => /^(#|C\d|K\d)/.test(value)
          ? <CopyRow key={use} use={use} value={value} />
          : (
            <div key={use} className="flex justify-between gap-1 sm:gap-4">
              <p>{use}</p>
              <p className="text-right">{value}</p>
            </div>
          ))}
      </div>
    </div>
  )
}

/**
 * A swatch row with a colour code: the whole row, label and code, copies the code on a click and says so in the
 * label's place for a moment, the code staying in view as what was copied.
 */
export function CopyRow({ use, value }: { use: string; value: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 500)
    return () => clearTimeout(t)
  }, [copied])
  const text = `${UNDERLINE} group-hover:decoration-current/40 group-hover:duration-0`
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(value).then(() => setCopied(true), () => {})}
      className="group flex cursor-pointer justify-between gap-1 sm:gap-4 text-left"
    >
      <span className={text}>{copied ? 'Скопировано' : use}</span>
      <span className={`whitespace-nowrap text-right tabular-nums ${text}`}>{value}</span>
    </button>
  )
}

/** 210×280 colour example that still needs its photo background, exported from Figma with the logo baked in. */
export function Photo({ name }: { name: string }) {
  return (
    <img src={img(name)} alt="" width={420} height={560} loading="lazy" decoding="async" className="block h-auto w-full" style={{ aspectRatio: '210 / 280' }} />
  )
}

/**
 * The price card as the generator sets it for a model's trim by default, the generator's own outlines (`CardArt`), with
 * its fonts and photo loaded once the guide is up; the white card meanwhile
 */
export function PriceCardPreview({ model, trim, alt }: { model: string; trim: string; alt: string }) {
  const [card, setCard] = useState<{ art: Art; Draw: typeof import('@/pricecard/CardArt').default }>()
  useEffect(() => {
    let on = true
    Promise.all([import('@/pricecard/card'), import('@/pricecard/CardArt'), import('@/ui/type')])
      .then(([c, a, t]) => Promise.all([t.loadFonts(), c.loadRunFonts()]).then(([fonts, runs]) => {
        const data = c.trimOf(model, trim)
        const art = c.buildCard({ ...fonts, runs }, { model, trim, full: data.full, legal: data.legal, url: modelOf(model).page })
        if (on) setCard({ art, Draw: a.default })
      }))
    return () => { on = false }
  }, [])
  return (
    <div role="img" aria-label={alt} className="bg-white" style={{ aspectRatio: '210 / 297' }}>
      {card && <card.Draw art={card.art} />}
    </div>
  )
}

/**
 * A file from public/downloads/, its row named in Russian by `label` (the file's own name, as saved, stays English), a
 * page of this site (its title and path), or a file a generator makes, `t` the link that makes it (a blank template:
 * `?t`), named by `label` («Шаблон режимника»). `also`: the same item in other formats, on the right of its row after
 * the file's own: the row downloads the vector, its PNG the PNG («Логотип  SVG  PNG»). A page's
 * `verb`, if any, stands on its right in place of its path, `template` a PDF link after it («Указать часы работы  PDF»: the
 * row opens the constructor, named by what's done there, the template second to it; `download`, the name while the PDF is
 * pointed at, «Шаблон визитки»)
 */
export type Asset = { file: string; label?: string; also?: { file: string }[] } | { to: string; title: string; verb?: string; download?: string; template?: { t: string; file: string } } | { t: string; label: string; file: string }

/**
 * A file's format, on the right of its row in place of a size (every file here is small, so a size said nothing; the
 * format says what opens it): its extension, or for an archive what's in it («logo-png.zip»: PNG)
 */
export const formatOf = (a: { file: string }) =>
  (a.file.match(/-(png|svg)\.zip$/)?.[1] ?? a.file.split('.').pop() ?? '').toUpperCase()

/** The rows' ↗ and ↓ before the name: off (a trial), the right column saying it already (a path, a format) */
export const ROW_ARROWS = false

/**
 * Asset list: a row per file or page, a hairline above each. Up to 3 rows stay in one column, 4 and more
 * split into two, filled top to bottom so files of one item stay together.
 */
/** `early`: two columns from 560 px, rather than from `sm` (Леттеринг → Модели, whose pictures pair up from 520); `bare`: no hairline over the first row (Материалы, the row right under its picture) */
export function Assets({ items, preview, early, bare }: { items: Asset[]; preview?: string; early?: boolean; bare?: boolean }) {
  const pointed = useContext(PointedPreview)?.[0]
  const two = items.length > 3
  return (
    <div
      className={two ? (early
        ? 'grid grid-cols-1 gap-x-4 min-[560px]:grid-flow-col md:gap-x-6 min-[560px]:grid-cols-2 min-[560px]:grid-rows-[repeat(var(--rows),auto)]'
        : 'grid grid-cols-1 gap-x-4 sm:grid-flow-col md:gap-x-6 sm:grid-cols-2 sm:grid-rows-[repeat(var(--rows),auto)]') : 'flex flex-col'}
      style={two ? ({ '--rows': Math.ceil(items.length / 2) } as CSSProperties) : undefined}
    >
      {items.map((a, i) => {
        // `bare` drops the hairline over the first row only (the one right under its picture)
        const row = `group flex items-center gap-2 ${bare && i === 0 ? '' : 'border-t border-line'} py-[14px] text-[16px] leading-none tracking-[-0.01em]`
        // The row a preview above stands for lights up while the preview is pointed at
        const linked = preview === ('to' in a ? a.to : a.file)
        const lit = pointed !== undefined && pointed === ('to' in a ? a.to : a.file)
        // Underlined while pointed at itself, as a format is, or while its picture is, which this row stands for (the row
        // pointed at elsewhere shows the arrow after it)
        const name = `min-w-0 flex-1 font-medium ${UNDERLINE} hover:decoration-black/40 hover:duration-0 ${linked ? 'group-has-[[data-preview]:hover]/preview:decoration-black/40 group-has-[[data-preview]:hover]/preview:duration-0' : ''} ${lit ? 'decoration-black/40 duration-0' : ''}`
        // The name with the arrow after it, 8 px off, shown while what it stands for is pointed at (`show`: the classes
        // that show it; the font's ↗ and ↓)
        const named = (text: ReactNode, show: string, arrow = '↓') => (
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className={name.replace('min-w-0 flex-1 ', 'min-w-0 ')}>{text}</span>
            <span aria-hidden className={`hidden font-medium ${show}`}>{arrow}</span>
          </span>
        )
        // The row's own link pointed at, or its picture
        const pointedRow = `group-hover:inline ${linked ? 'group-has-[[data-preview]:hover]/preview:inline' : ''} ${lit ? 'inline' : ''}`
        // A format pointed at itself is underlined as the name is, the link it stands for
        const format = `${UNDERLINE} hover:decoration-black/40 hover:duration-0`
        const meta = `shrink-0 text-caption [font-feature-settings:"tnum"_1] group-hover:text-black ${linked ? 'group-has-[[data-preview]:hover]/preview:text-black' : ''} ${lit ? 'text-black' : ''}`
        if ('to' in a && a.template) {
          const tpl = a.template
          return (
            // After the name, 8 px off it, what a click does where the pointer is: ↗ over the card (its picture or row, the
            // constructor), ↓ over the PDF (the font's own arrows)
            <div key={a.to} className={`group/row flex items-stretch ${bare && i === 0 ? '' : 'border-t border-line'}`}>
              <Link to={a.to} title={editTitle(a.to)} className={`${row.replace(/border-t border-line/, '')} min-w-0 flex-1`}>
                {ROW_ARROWS && <span aria-hidden className="w-4 shrink-0 text-center font-medium">↗</span>}
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  {/* Over the PDF the verb gives way to the template's name («Шаблон визитки»), the name saying what that click does */}
                  <span className={`${name.replace('min-w-0 flex-1 ', 'min-w-0 ')} ${a.download ? 'group-has-[[data-format]:hover]/row:hidden' : ''}`}>{a.title}</span>
                  {a.download && <span aria-hidden className={`hidden ${name.replace('min-w-0 flex-1 ', 'min-w-0 ')} group-has-[[data-format]:hover]/row:inline`}>{a.download}</span>}
                  <span aria-hidden className={`hidden font-medium group-hover:inline ${linked ? 'group-has-[[data-preview]:hover]/preview:inline' : ''}`}>↗</span>
                  <span aria-hidden className="hidden font-medium group-has-[[data-format]:hover]/row:inline">↓</span>
                </span>
                {a.verb && <span className={`${meta} ${format}`}>{a.verb}</span>}
              </Link>
              <a href={tpl.t} target="_blank" rel="noopener" data-format title={`Скачать ${formatOf(tpl)}`} aria-label={`${a.title}, шаблон ${formatOf(tpl)}`} className="group/format flex shrink-0 items-center pl-3 text-[16px] leading-none tracking-[-0.01em] text-caption hover:text-black">
                <span className={`${UNDERLINE} group-hover/format:decoration-black/40 group-hover/format:duration-0`}>{formatOf(tpl)}</span>
              </a>
            </div>
          )
        }
        if ('to' in a) {
          return (
            <Link key={a.to} to={a.to} title={editTitle(a.to)} className={row}>
              {ROW_ARROWS && <span aria-hidden className="w-4 shrink-0 text-center font-medium">↗</span>}
              <span className={name}>{a.title}</span>
              <span className={meta}>{a.to}</span>
            </Link>
          )
        }
        // A generator's file: its link makes and saves it, in a tab of its own so the guide stays
        if ('t' in a) {
          return (
            <a key={a.file} href={a.t} target="_blank" rel="noopener" title={`Скачать ${formatOf(a)}`} className={row}>
              {ROW_ARROWS && <span aria-hidden className="w-4 shrink-0 border-b border-black pb-px text-center font-medium">↓</span>}
              {named(a.label, pointedRow)}
              <span className={`${meta} ${format}`}>{formatOf(a)}</span>
            </a>
          )
        }
        if (a.also?.length) {
          // The row is the file's link, its other formats links of their own after it, each the row's height (a
          // finger's target on phones), pointing at one lighting it alone
          return (
            <div key={a.file} className={`group/row flex items-stretch ${bare && i === 0 ? '' : 'border-t border-line'}`}>
              <a href={`/downloads/${a.file}`} download title={`Скачать ${formatOf(a)}`} className={`${row.replace(/border-t border-line/, '')} min-w-0 flex-1`}>
                {ROW_ARROWS && <span aria-hidden className="w-4 shrink-0 border-b border-black pb-px text-center font-medium">↓</span>}
                {named(a.label ?? a.file, `${pointedRow} group-has-[[data-format]:hover]/row:inline`)}
                <span className={`${meta} ${format}`}>{formatOf(a)}</span>
              </a>
              {a.also.map(f => (
                <a key={f.file} href={`/downloads/${f.file}`} download data-format title={`Скачать ${formatOf(f)}`} aria-label={`${a.label ?? a.file}, ${formatOf(f)}`} className="flex shrink-0 items-center pl-3 text-[16px] leading-none tracking-[-0.01em] text-caption [font-feature-settings:'tnum'_1] hover:text-black group/format">
                  <span className={`${UNDERLINE} group-hover/format:decoration-black/40 group-hover/format:duration-0`}>{formatOf(f)}</span>
                </a>
              ))}
            </div>
          )
        }
        return (
          <a key={a.file} href={`/downloads/${a.file}`} download title={`Скачать ${formatOf(a)}`} className={row}>
            {ROW_ARROWS && <span aria-hidden className="w-4 shrink-0 border-b border-black pb-px text-center font-medium">↓</span>}
            {named(a.label ?? a.file, pointedRow)}
            <span className={`${meta} ${format}`}>{formatOf(a)}</span>
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
export function PreviewLink({ asset, label, children }: { asset: Asset; label: string; children: ReactNode }) {
  const className = 'block'
  const setPointed = useContext(PointedPreview)?.[1]
  const key = 'to' in asset ? asset.to : asset.file
  const hover = setPointed && { onPointerEnter: () => setPointed(key), onPointerLeave: () => setPointed(undefined) }
  return 'to' in asset
    ? <Link to={asset.to} aria-label={label} title={editTitle(asset.to)} data-preview={setPointed ? undefined : ''} className={className} {...hover}>{children}</Link>
    : <a href={`/downloads/${asset.file}`} download aria-label={label} title={`Скачать ${formatOf(asset)}`} data-preview={setPointed ? undefined : ''} className={className} {...hover}>{children}</a>
}

/** The file or page whose picture is pointed at, inside a `Previews` group. */
export const PointedPreview = createContext<[string | undefined, (key: string | undefined) => void] | null>(null)

/**
 * A group where pictures lead to different rows of the `Assets` under them (Логотип на иконках: the favicon, the app
 * icon, the userpic), so pointing at one lights its own row rather than the single `preview` one.
 */
export function Previews({ className, children }: { className: string; children: ReactNode }) {
  const pointed = useState<string>()
  return <PointedPreview.Provider value={pointed}><div className={className}>{children}</div></PointedPreview.Provider>
}

/** A constructor page's preview over its ↗ row; `flush` sets the row right under the preview, with no gap and no hairline. */
export function Constructor({ to, title, label, flush, template, children }: { to: string; title: string; label: string; flush?: boolean; template?: { file: string; label?: string; query?: string }; children: ReactNode }) {
  return (
    <div className={`group/preview flex flex-col ${flush ? '' : 'gap-4 md:gap-6'}`}>
      <PreviewLink asset={{ to, title }} label={label}>{children}</PreviewLink>
      {/* The generator's row, named by what's done there, its template (made by its `?t` link) a PDF after it */}
      <Assets items={[{ to, title: label, download: template?.label, template: template && { t: `${to}?${template.query ? `${template.query}&` : ''}t`, file: template.file } }]} preview={to} bare={flush} />
    </div>
  )
}


/** A picture that opens large over the page on a click (a lightbox); a click anywhere or Esc closes it. */
export function Zoom({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const overflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.documentElement.style.overflow = overflow }
  }, [open])
  return (
    <>
      <button type="button" aria-label={label} onClick={() => setOpen(true)} className="block w-full cursor-zoom-in">
        {children}
      </button>
      {open && (
        <div role="dialog" aria-label={label} onClick={() => setOpen(false)} className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-white p-4 md:p-12">
          <div className="w-[min(100%,calc((100dvh-2rem)*4/3))] md:w-[min(100%,calc((100dvh-6rem)*4/3))]">{children}</div>
        </div>
      )}
    </>
  )
}


/** A heading + text group. Sections are separated by 144px; a Chapter adds 72px on top of its first one. */
export function Section({ children }: { children: ReactNode }) {
  return <section className="flex flex-col gap-8 md:gap-12">{children}</section>
}

export function Head({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-6">{children}</div>
}


export type Rule = { good: ReactNode; bad: ReactNode; why: string }

/**
 * Коммуникация → Примеры: the voice as it reads in the brand's own messages — chat-like grey bubbles
 * (round but the top-left corner), photos with a line over them. Three columns from `md`, each a stack; in the
 * middle and right ones the photo takes what's left, so the columns end level. On phones they stack in one column,
 * the photos 3:4.
 */
export function Bubble({ title, children }: { title?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-tr-2xl rounded-b-2xl bg-surface p-4 leading-[1.25]">
      {title && <p className="text-[20px] font-medium tracking-[-0.01em]">{title}</p>}
      {children && <p className="text-[16px]">{children}</p>}
    </div>
  )
}

/** `focus`: the crop's vertical point in % on phones, where the 4:3 crop would cut the subject (the runner's head) */
export function PhotoCard({ name, title, children, grow, focus }: { name: string; title: ReactNode; children?: ReactNode; grow?: boolean; focus?: number }) {
  return (
    // 4:3 on phones, to save the one column's height; 3:4 from md, as in Figma. Shaped as the bubbles, a message too
    <div className={`relative aspect-4/3 overflow-hidden rounded-tr-2xl rounded-b-2xl bg-surface sm:aspect-3/4 ${grow ? 'sm:aspect-auto sm:min-h-0 sm:flex-1' : ''}`}>
      <img src={img(name)} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover sm:object-center!" style={focus !== undefined ? { objectPosition: `50% ${focus}%` } : undefined} />
      <div className="absolute inset-x-4 top-4 flex flex-col gap-2 leading-[1.25] text-white">
        {/* A line alone over a photo is 240 wide, as in Figma, so it breaks the same way on any card */}
        <p className={`text-[20px] font-medium tracking-[-0.01em] ${children ? '' : 'max-w-[240px]'}`}>{title}</p>
        {children && <p className="text-[16px]">{children}</p>}
      </div>
    </div>
  )
}


export function Dictionary({ rows }: { rows: Rule[] }) {
  // Fixed tracks: each row is a grid of its own, and with plain 1fr a long unbreakable phrase widens its column in
  // its row only, so the columns jump from row to row
  const cols = 'md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]'
  // A list breaks after its commas: as separate text nodes, the typograph doesn't tie its last item to the one before
  // (else «Инновационный, революционный» is one unbreakable line, wider than its column)
  const list = (s: ReactNode) => (typeof s === 'string' ? s.split(/(?<=, )/) : s)
  const mark = (m: string) => <span className="w-[30px] [font-feature-settings:'case'_1]">{m}</span>
  return (
    <div className="text-[16px] leading-[1.25] tracking-[-0.01em]">
      <div className={`hidden md:grid ${cols} gap-x-6 py-4 font-medium`}>
        <p className="flex gap-2">Стандарт бренда {mark('✓')}</p>
        <p className="flex gap-2">Ошибка {mark('✗')}</p>
        <p>Мотивация</p>
      </div>
      {rows.map((row, i) => (
        <div key={i} className={`grid grid-cols-1 ${cols} gap-x-6 gap-y-2 border-t border-line py-4`}>
          <p className="font-medium"><span className="md:hidden">✓&nbsp;</span>{list(row.good)}</p>
          <p><span className="md:hidden">✗&nbsp;</span>{list(row.bad)}</p>
          <p className="text-caption md:text-black">{row.why}</p>
        </div>
      ))}
    </div>
  )
}

