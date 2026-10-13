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
/** The thin chevron in the header that turns the phone's sheet: up to open it a step, down to put it back (null: none) */
export const SheetSize = createContext<null | { up: boolean; label: string; toggle: () => void }>(null)
