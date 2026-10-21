// What a brand gives the core. A brand is a folder, `brand/<name>/` (UMO's is `brand/umo`), and the code imports its
// parts as `@brand/<part>` (the alias in vite.config.ts picks the folder, `BRAND`, UMO by default): its `public/` is
// the site's root (fonts, downloads, icons), `theme.css` the site's type, and each part below a module of its own, so
// a page loads only what it uses. The types here are what each part has to hold.

/** One face of the brand's type: the file under `public/` (TrueType, for opentype.js and the templates) and its PostScript name */
export interface BrandFont { file: string; name: string }

/** `@brand/fonts`: the type the generators set their files in, in outlines, and their editable templates in, live */
export interface BrandFonts {
  /** A short name for the type, naming its fonts in a PDF's resources («CoFo»: CoFoRegular, CoFoR) */
  short: string
  regular: BrandFont
  medium: BrandFont
}

/** A drawing in absolute path data (M L H V C Z), `w`×`h` units */
export interface Mark { w: number; h: number; d: string }

/** A colour as the guide's Цвет shows it: its tile's colour, white text on it if `dark`, its values (where used, the code) */
export interface Swatch { name: string; color: string; dark?: boolean; values: [string, string][] }

/**
 * `@brand/colors`: the brand's colours for the guide's Цвет, the main ones in large tiles, the service ones in small.
 * The site's own greys are tokens in `theme.css` (`--color-surface`, `--color-line`, `--color-caption`)
 */
export interface BrandColors { main: Swatch[]; service: Swatch[] }
