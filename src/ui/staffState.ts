import { createContext } from 'react'

export const REMOVED_MS = 4000

export const ITEM_EDGE = 'outline-1 -outline-offset-1 outline-ink/10 group-hover/row:outline-ink/40'
/** `ITEM_EDGE` on a layer over the item, for an item whose art is positioned inside it (the price card's poster, the
 * memo's pages), which would cover an edge on the item itself; the item is `relative`. 20% on hover: 40 is harsh round
 * a page this big */
export const ITEM_EDGE_OVER = "relative after:pointer-events-none after:absolute after:inset-0 after:content-[''] after:outline-1 after:-outline-offset-1 after:outline-ink/10 group-hover/row:after:outline-ink/20"

export const ItemNumber = createContext<number | undefined>(undefined)

