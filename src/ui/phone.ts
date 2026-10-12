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
/** The sheet's foot: the download is one button there, opening the sheet when it leads to a field */
export const InFoot = createContext<null | (() => void)>(null)
/** The phone's sheet over the whole screen or not, and the icon in its header that turns it (Figma 5098:5487) */
export const SheetSize = createContext<null | { full: boolean; toggle: () => void }>(null)
/** Trial: the place for Alice's offer at the form's end in the phone's sheet, which the download fills (`AliceOffer`) */
export const AliceSlot = createContext<HTMLElement | null>(null)
