// What a brand gives the core. A brand is a folder, `brand/<name>/`, and the code imports its
// parts as `@brand/<part>` (the alias in vite.config.ts picks the folder, `BRAND`): its `public/` is
// the site's root (fonts, downloads, icons), `theme.css` the site's type, and each part below a module of its own, so
// a page loads only what it uses. The types here are what each part has to hold.

/** One face of the brand's type: the file under `public/` (TrueType, for opentype.js and the templates) and its PostScript name */
export interface BrandFont { file: string; name: string }

/** `@brand/fonts`: the type the generators set their files in, in outlines, and their editable templates in, live */
export interface BrandFonts {
  /** The type's name as people know it, which a template's editor needs installed */
  family: string
  /** A short name for the type, naming its fonts in a PDF's resources (`Brand`: BrandRegular, BrandR) */
  short: string
  regular: BrandFont
  /** The same face as `regular` for a type of one weight: the generators then set everything in it */
  medium: BrandFont
}

/** A drawing in absolute path data (M L H V C Z), `w`×`h` units */
export interface Mark { w: number; h: number; d: string }

/** A colour as the guide's Цвет shows it: its tile's colour, white text on it if `dark`, its values (where used, the code) */
export interface Swatch { name: string; color: string; dark?: boolean; values: [string, string][] }

/**
 * `@brand/colors`: the brand's colours for the guide's Цвет, the main ones in large tiles, the service ones in small,
 * and `ink`, the black the generators print film, signs and a black ground in (C, M, Y, K from 0 to 1; text on white
 * stays 100% K). The site's own greys are tokens in `theme.css` (`--color-surface`, `--color-line`, `--color-caption`)
 */
export interface BrandColors { main: Swatch[]; service: Swatch[]; ink: [number, number, number, number] }

/** A chapter of the guide in its contents, with its sections; `id` its anchor */
export interface GuideChapter { id: string; title: string; children?: GuideChapter[] }

/**
 * A point: a place of the brand's where its people meet clients (UMO's dealers, an office, a branch), as the
 * generators know it: its name as the brand writes it, city, short address, hours («ежедневно, 09:00–21:00»), phone,
 * and the names it's also called by (`aka`)
 */
export interface Point { name: string; city: string; address: string; hours: string; phone: string; aka: string[] }

/**
 * `@brand/points`: the brand's points, lists merged in order (a later one adds to or corrects an earlier one, by name),
 * `prefix` the brand's name every point's name starts with («<Бренд> Точка Город»), `words` words that don't tell points
 * apart (the brand's name as people write it, what they call a point; `@brand/words`' own word counts already);
 * `param` the point's name in a link (`point` without it); `site` the site a point's name makes (none without it)
 */
export interface BrandPoints { lists: Partial<Point>[][]; prefix: string; words: string[]; param?: string; site?: (name: string) => string }

/**
 * `@brand/words`: what the brand calls its points where the editor speaks of them, as whole phrases, since Russian
 * declines them and the core never does: `one` a field's label («Дилер»), `many` the suggestions' heading before the
 * brand's name («Дилеры»), `of` whose («дилера»: «Название дилера», «Телефон дилера»), `pick` what's picked
 * («дилера»: «Выбрать дилера», «филиал»: «Выбрать филиал»), what a link's page asks (`which` of several, `yours` of one)
 * and says of none (`notListed`), `file` its word in files' names (`dealer` in <Brand>8_dealer-livery.zip; none for none)
 */
export interface BrandWords {
  point: { one: string; many: string; of: string; pick: string; which: string; yours: string; notListed: string; file?: string }
  /** The price card's product and its variant, as their fields are labelled and the card prints the variant («Модель», «Комплектация») */
  product: { one: string; variant: string }
  /** What the livery wraps, its field's label («Модель») */
  vehicle: { one: string }
}

/**
 * `@brand/site.json`: the site's settings. The core reads these; vite.config.ts also the HTML's (title, description,
 * icons, social image, robots, language)
 */
export interface BrandSite {
  /** The brand's name as the pages write it: «Бренд <Бренд>», «Ценник <Бренд>» */
  name: string
  /** What the files' names start with: <Brand>_price-tags.pdf */
  file: string
  /** Where this site lives (its domain): the links the instructions give, the Metrika counter's host */
  domain: string
  /** The brand's own site (https://…): a QR's default, the points' sites under it */
  home: string
  /** Where people ask: the guide's Контакты and the generators' «Инструкция» */
  support: string
  /** Yandex.Metrika's counter, none for no counter */
  metrika?: number
  /** The editor's name in the generators' header, «Редактор материалов» without it */
  editor?: string
  /** The generators the brand has, by path (`business-card`), the rest left out of the site; without it, every one */
  materials?: string[]
}

/**
 * A product of the brand (UMO's models) or a vehicle its livery wraps: its id in links and data (`brand5`), its name
 * as written («<Бренд> 5»), its page on the brand's site (a QR's default)
 */
export interface BrandProduct { id: string; name: string; page: string }
