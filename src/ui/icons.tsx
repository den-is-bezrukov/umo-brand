/**
 * The generators' quiet icons' stroke: 1 px, finer than the sidebar's 2 px icons, as the item's action column stands
 * quietly beside it (Figma 5030:11424); `staff.tsx` draws its icons with it. Here, apart, what's used outside the lists
 */
export const ICON = { fill: 'none', stroke: 'currentColor', strokeWidth: 1, strokeLinecap: 'square' as const, strokeLinejoin: 'bevel' as const }

/** The generators' cross, 16 px: the site's dialog closes with it */
export const CrossIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" {...ICON} aria-hidden><path d="M12 4L8 8M8 8L4 4M8 8L12 12M8 8L4 12" /></svg>
)
