import { createContext } from 'react'

// The phone layout's places (`MobileEditor` in mobile.tsx), apart from it so the shared controls can read them without
// importing it

/** Inside the phone layout's slides: an item stands alone, its number and actions over and under the strip instead */
export const InSlide = createContext(false)
/** The phone layout's sheet: a combobox there opens as a screen of its own, as a search does */
export const InSheet = createContext(false)
/** The sheet's foot: the download is one button there, opening the sheet when it leads to a field */
export const InFoot = createContext<null | (() => void)>(null)
