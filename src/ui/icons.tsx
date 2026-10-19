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

/**
 * A link, Iconoteka's «Link Angle» (filled, 24 px drawn at 16: its line comes to 0.9 px, as the 1 px icons beside it):
 * copying a link (`CopyLink` in «Инструкция»), apart from duplicating an item
 */
export const LinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" pointerEvents="none" aria-hidden><path d="M4.82568 11.9001C2.77568 13.9251 2.80068 17.1001 4.85068 19.1501C6.90068 21.2001 10.0757 21.2001 12.1007 19.1751L14.7507 16.5251L16.0507 17.8251L13.4007 20.4751C10.6257 23.2501 6.27568 23.2501 3.50068 20.4751C0.725683 17.7001 0.725683 13.3501 3.50068 10.5751L6.17568 7.9251L7.47568 9.2501L4.82568 11.9001ZM9.25068 7.4751L7.92568 6.1751L10.5757 3.5251C13.3507 0.750098 17.7007 0.750098 20.4757 3.5251C23.2507 6.3001 23.2507 10.6501 20.4757 13.4251L17.8257 16.0751L16.5257 14.7501L19.1757 12.1001C21.2007 10.0751 21.2007 6.9001 19.1507 4.8501C17.0757 2.8001 13.9257 2.8001 11.9007 4.8251L9.25068 7.4751ZM7.75068 16.2501C7.37568 15.8751 7.37568 15.3001 7.75068 14.9251L14.9007 7.8001C15.2757 7.4001 15.8757 7.3751 16.2507 7.7501C16.6007 8.1251 16.6007 8.7251 16.2007 9.1001L9.05068 16.2501C8.70068 16.6251 8.12568 16.6251 7.75068 16.2501Z" /></svg>
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
