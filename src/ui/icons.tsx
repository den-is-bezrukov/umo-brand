/**
 * The generators' quiet icons' stroke: 1 px, finer than the sidebar's 2 px icons, as the item's action column stands
 * quietly beside it (Figma 5030:11424); `staff.tsx` draws its icons with it. Here, apart, what's used outside the lists.
 * The pointer goes through them to their button: Chrome showed no `title` over an SVG inside a button, so no icon on
 * the canvas had its tooltip
 */
export const ICON = { fill: 'none', stroke: 'currentColor', strokeWidth: 1, strokeLinecap: 'square' as const, strokeLinejoin: 'bevel' as const, pointerEvents: 'none' as const }

/** The generators' cross, 16 px; 2 px in the site's dialog, as the chevron by its title */
export const CrossIcon = ({ weight = 1 }: { weight?: number }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" {...ICON} strokeWidth={weight} aria-hidden><path d="M12 4L8 8M8 8L4 4M8 8L12 12M8 8L4 12" /></svg>
)

/** A link, two chain links: copying a link (`CopyLink` in «Инструкция»), apart from duplicating an item */
export const LinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" {...ICON} aria-hidden>
    <g transform="rotate(-45 8 8)"><rect x="1.5" y="5.5" width="7" height="5" rx="2.5" /><rect x="7.5" y="5.5" width="7" height="5" rx="2.5" /></g>
  </svg>
)

/** Duplicate, two squares: an item's copy in the lists */
export const DuplicateIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" {...ICON} aria-hidden><path d="M3.5 6H2V14H10V12.5M6 2H14V10H6V2Z" /></svg>
)

/** A combobox's chevron, 14 px, a 2 px stroke as the sidebar's icons; turned over while what it opens is open */
export const ChevronIcon = ({ open }: { open?: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className={open ? 'rotate-180' : undefined}>
    <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="bevel" />
  </svg>
)
