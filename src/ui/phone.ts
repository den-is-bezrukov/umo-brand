import { createContext } from 'react'

// The phone layout's places (`MobileEditor` in mobile.tsx), apart from it so the shared controls can read them without
// importing it

/** Inside the phone layout's slides: an item stands alone, its number and actions over and under the strip instead */
export const InSlide = createContext(false)
/**
 * The phone layout's sheet, as its height (or '' outside it): a combobox there opens as a screen of its own, as a search
 * does, and the generators' menu as a sheet of the same height over it
 */
export const InSheet = createContext('')
/**
 * A layer over the sheet, as large as it shows (`hidden`, how much of it is under the screen's bottom): a combobox's
 * list opens there, in the sheet's width and height, not over the whole screen
 */
export const SheetLayer = createContext<{ el: HTMLElement | null; hidden: number }>({ el: null, hidden: 0 })
/** The sheet's foot: the download is one button there, opening the sheet when it leads to a field */
export const InFoot = createContext<null | (() => void)>(null)
