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

/** A chapter of the guide in its contents, with its sections; `id` its anchor */
export interface GuideChapter { id: string; title: string; children?: GuideChapter[] }

/**
 * A point of sale (a dealer) as the generators know it: its name as the brand writes it, city, short address, hours
 * («ежедневно, 09:00–21:00»), phone, and the names it's also called by (`aka`)
 */
export interface SalesPoint { name: string; city: string; address: string; hours: string; phone: string; aka: string[] }

/**
 * `@brand/points`: the points of sale, lists merged in order (a later one adds to or corrects an earlier one, by name),
 * `prefix` the brand's name every point's name starts with («UMO АГАТ Владимир»), `words` the brand's name as people
 * write it, which doesn't tell points apart
 */
export interface BrandPoints { lists: Partial<SalesPoint>[][]; prefix: string; words: string[] }

/**
 * `@brand/site.json`: the site's settings. The core reads these; vite.config.ts also the HTML's (title, description,
 * icons, social image, robots, language)
 */
export interface BrandSite {
  /** The brand's name as the pages write it: «Бренд UMO», «Ценник UMO» */
  name: string
  /** What the files' names start with: UMO_price-tags.pdf */
  file: string
  /** Where this site lives (umo.autos): the links the instructions give, the Metrika counter's host */
  domain: string
  /** The brand's own site (https://umo.auto): a QR's default, the dealers' sites under it */
  home: string
  /** Where people ask: the guide's Контакты and the generators' «Инструкция» */
  support: string
  /** Yandex.Metrika's counter, none for no counter */
  metrika?: number
}
