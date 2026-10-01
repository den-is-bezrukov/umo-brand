# umo-brand

React + Vite + Tailwind CSS site for UMO brand materials: the brand guide at `/`, the price-card poster generator at `/price-card` (web preview + print-ready PDF export) and the dealer livery generator at `/livery` (car preview + cut files). Deployed to `umo.autos` via GitHub Pages on every push to `main` (`.github/workflows/deploy.yml`).

## Development Server

Nothing runs automatically — start it yourself:

```bash
pnpm dev
```

This serves the app at `http://localhost:8443` (port set in `vite.config.ts`, not the Vite default). Hot reload is on; changes to source files show up immediately.

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint and router: `/` → `src/guide/Guide.tsx`, `/price-card` → `src/App.tsx`, `/livery` → `src/Livery.tsx` (all lazy-loaded), anything else redirects to `/`
- `src/App.tsx` - Price-card generator page
- `src/Livery.tsx` - Dealer livery generator page (see "Dealer livery" below)
- `src/livery/` - Livery surfaces in mm (`layout.ts`), outlines (`geometry.ts`), UMO 8 lettering (`logo.ts`) and the PDF/zip export (`pdf.ts`)
- `src/ui/form.tsx` - Sidebar controls shared by the generators (segments, fields, the QR link field, checkboxes, the download button)
- `src/guide/Guide.tsx` - Brand guide page (see "Brand guide" below)
- `src/posters/` - Poster components: `PriceCard.tsx` (web preview) and `pdf/PriceCardPdf.tsx` (PDF export), sharing data from `cardData.ts`
- `src/icons/` - SVG path data for the UMO logo/badges and small UI icons, imported directly by component name
- `src/index.css` - Global CSS entrypoint and Tailwind CSS v4 import
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `site.config.json` - Site title/description/favicon/OG-image/robots, applied to the built HTML by the `site-meta` Vite plugin. Icons in `public/` (Figma fav 4870:3556): `favicon.svg` and `favicon.ico` are the U module of the logo, white on a black tile — the full wordmark turns to mush at 16px. The tile is rounded in the icon itself: radius 1 on the 16 grid with 60% corner smoothing (Figma fav 4870:3579 has 8 on 40, too round at tab size), since Safari and Chrome show favicons as drawn and a square black tile looks cut out on a dark tab bar. The U is hinted: on a 16-unit grid its stems (2), bar (2) and edges sit on whole units, so it lands on whole pixels at 16, 32 and 48; the .ico's 16px frame keeps the hand-drawn U with mirrored corners and takes its rounded-corner alpha from the SVG; 32/48 are Chrome renders of the SVG at 768px, box-downscaled. `apple-touch-icon.png` (180) carries the whole UMO wordmark at 2/3 of the tile (120×24 at 30,78), as the app icon in Логотип на иконках
- `package.json` - Project dependencies and the Vite build, development, preview, and formatting scripts
- `vite.config.ts` - Vite configuration: React, Tailwind CSS v4, the `@` alias for `src`, and the `site-meta` plugin

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. This scaffold does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`. Keep CSS `@import` statements first, then add any `@font-face` rules and font-family defaults there.

## Brand guide (`/`)

`src/guide/Guide.tsx` is the web version of the UMO brand guide page from Figma ([UMO | Evrone, node 4810:686](https://www.figma.com/design/i6PdEDo72Vab0cAixG0nIz/UMO-%257C-Evrone?node-id=4810-686)). Text and layout are live code; every illustration is a Figma frame exported at 2x and saved as `src/assets/guide/<name>.webp` (cwebp `-q 90`), picked up automatically by `import.meta.glob`.

To refresh an illustration, re-export that frame at 2x and overwrite the file with the same name. Export the whole section Block and crop the frame out of it: frames that stretch inside a grid/flex parent come out of Figma's direct export at the wrong size (a mostly empty canvas).

Vector schemes (clear space, minimum size, co-branding, type specimens, model lettering) are SVG files in the same folder — `img()` prefers `<name>.svg` over `<name>.webp`. They are cut out of Figma SVG exports of the parent Body nodes by `scripts/split-figma-svg.py` (node ids and crop boxes are listed at the bottom of the script). Text inside them is outlined by Figma. The lettering pictures (`lettering-model8` / `lettering-model5`: MODEL lettering over its number plate) are laid out by the script's `assemble()` from separate layer exports instead, as those frames export stretched. Photos, logo misuse examples, app/social icons and model posters stay WebP.

The UMO 5 / UMO 8 ad banners in Ключевой образ are `Poster` components: a photo-only background (`<model>-<banner|square>-bg.webp`, about 3x the Figma frame) with the title, subtitle and `UmoYandexLockup` laid over it in container-width units, so text and lockup stay sharp at any size. The backgrounds were cut from the source photos using the layer geometry in Figma; the direct export of the banner photo layers is broken the same way as stretched frames.

Body copy (`Text`) takes its width from its length on the 12-column Figma grid: up to 150 characters 6 columns (432px), up to 300 — 8 (600px), longer — 9 (678px). Don't set widths by hand; texts paired side by side sit in a grid with `*:max-w-none` and fill their cells.

Vertical rhythm is fluid: `--spacing-section` (96px on a 375px phone → 216px at the 1440px Figma frame) and `--spacing-chapter` (144 → 288px) in `src/index.css`, used as `gap-section` between sections and as the extra top padding of a `Chapter`; don't hard-code breakpoint gaps between blocks. Each chapter is a `Chapter` (id, title, then its `Section`s). A section's opening picture goes above its heading, with the section anchor on the picture (Позиционирование, Фотография). Chapters stay two levels deep — chapter, then its sections. Пространства holds the brand's physical places (for now its intro with the dealership photo; the Дилерский центр section is drafted and commented out in `Guide.tsx`); Носители (anchor `materials`) the templated media (Прайс-карта, Ливрея, later leaflets and the like), as Porsche splits Spaces from Analog media. Anchor ids sit on an empty marker above the title, so keep new chapters inside `Chapter` rather than a bare `<h2 id>`. Links to the guide have gone out, so when an anchor id changes, add the old one to `OLD_ANCHORS` in `Guide.tsx`: it is redirected to the new id on load and on a hash change.

Navigation follows Figma section TOC (node 4865:1079). The hero at the top of the page is not in the list: the logo leads there. Платформа бренда (the brand foundations: positioning, vision, mission, audience and voice) has no title of its own: the statement under the hero («UMO — это автомобильный бренд…») stands in for it and carries the `brand` anchor, so it isn't a `Chapter`. On `lg`+ the sidebar lists chapters with only the one you're reading open; the «Содержание / Свернуть» row (`TocToggle`, menu and cross icons from `src/icons/toc.ts`, the same as on the mobile bar) is pinned to the bottom of the screen, so it doesn't move as the open chapter changes the list's height. The choice is remembered in `localStorage`. When the list is taller than the screen, the sidebar scrolls itself to keep the item you're reading in view (`useActiveInView`). Below `lg` the header holds just the logo; a bar fixed at the bottom shows a menu icon and the title of the heading you're reading (any level, from `NAV`; «Платформа бренда» on the hero above it) and opens the full, expanded contents between header and bar, with «Свернуть» at the foot. Header, contents and bar keep the desktop's 24px padding down to `md` and drop to 16px below it.

Plain "logo on a flat colour" figures are not images: `LogoPlate` in `Guide.tsx` renders `src/guide/UmoLogo.tsx` (inline SVG, `currentColor`) centred on a background, with the logo width given in Figma frame units.

Downloads live in `public/downloads/` and are listed by the `Assets` component in `Guide.tsx`: one row per file (↓, file name, size) or per page of the site (↗, title, path, e.g. the price-card constructor). 1–3 rows stay in one column, 4+ split into two filled top to bottom, so list files grouped by item. Sizes come from the `virtual:download-sizes` module (`downloadSizesPlugin` in `vite.config.ts`), in КБ with a decimal comma; every row of a list gets one decimal as soon as one size is under 10, none otherwise. Each item ships as `<file>.svg` (black) and `<file>-png.zip` (black + white transparent PNGs). `umo-logo` (2400×480) sits under the Логотип figure, `umo-yandex` (the UMO | Яндекс lockup, 2080×400) under Кобрендинг, `umo-model-8` / `umo-model-5` (MODEL 8 / MODEL 5 lettering, 2400×280, exported from the `Vector` layers of Figma frame 4818:1961) under Леттеринг → Модели. The number plates `umo-plate-8` / `umo-plate-5` (5200×1120, the 520×112 mm plate) come in two colours that are separate designs rather than one mark on transparency, so they ship as one `<file>-svg.zip` holding `-black` (white on black) and `-white` (black on white), with no PNGs; the sources are `UMO-<n>_plate_b/_w.svg` from the Nameplate folder. In that list UMO 8 files come first so they fill the left column, under the UMO 8 pictures. Keep hairlines as filled rects, not stroked zero-width paths — ImageMagick drops the latter when rasterising. If the logo changes, update `umo-logo.svg` and `UmoLogo.tsx` together, then regenerate the PNGs, e.g. `magick -background none -density 360 umo-logo.svg -resize 2400x480 PNG32:umo-logo-black.png` (swap `fill="black"` for `white` for the white one), and re-zip with `zip -X -j`.

## Dealer livery (`/livery`)

Lettering for a dealer's demo car (Figma: UMO | Evrone, node 4021:2908): both sides and the rear window, with the dealer name, tagline and QR link editable. The rear window takes the sides' text unless «Свой текст на стекле» is ticked: then it gets its own dealer and tagline fields, filled from the sides the first time. It reproduces the hand-made files in Yandex Disk `02 UMO/Livery/UMO 8`, with the decals in one file: the zip holds `UMO8_dealer-livery.pdf` (three pages: left and right side, 1280×500 mm each, and the rear window, 835×250 mm; the hand-made set has the rear window as a separate `_rearwindow.pdf`) and `00_UMO8_dealer-livery_spec.pdf` (the sheets on the car photos with dimensions in red; one point there is one millimetre on the car).

Everything is in millimetres in `src/livery/layout.ts`: per surface the QR, the UMO wordmark and model number, two text blocks (dealer, tagline) and the obstacles. Text is CoFo Sans Medium, 40 mm on 40 mm lines on the sides and 37.5 on the rear, anchored at the last line's baseline so a block grows upwards; these numbers were measured off the Illustrator sources and match them within half a millimetre, except the bottom tagline baselines, raised by 2 mm so a descender in the last line stays on the sheet. Lines wrap by ink width; words of one or two characters (prepositions, a `|`) stick to the next word. Limits: on the sides the dealer is up to 450 mm and two lines (it must stay clear of the door handle), the tagline up to 400 mm and three lines (clear of the door seam); on the rear one dealer line (typed line breaks become spaces) and two tagline lines within 510 mm. Anything over the limit or within `clearance` of an obstacle turns red in the preview and blocks the download. The preview has two views: «На машине» (the sheets on the car photos) and «Чертёж» (the sheets alone on black, closed in so the dimensions read without the PDF). «Швы» adds the obstacles and where each text block may go; «Размеры» adds the spec's red dimensions to the car view (the drawing always has them). The dimensions come from `specMarks` in `geometry.ts`, which the spec PDF draws too.

The obstacles — the seam between the doors and the front door handle — were taken from the spec mockup and are approximate; correct them in `leftObstacles` once there are real measurements (the right side mirrors them). The side and rear pictures (`src/assets/livery/umo8-side.webp`, `umo8-rear.webp`) are the photos from the spec PDF, cropped with known placement: the side covers 4800×2000 mm of the spec page from (0, 450), the rear 2280×2400 from (300, 250); `photo.x`/`photo.y` is where the sheet sits on them.

Cut files are vector only: every shape is a filled outline (text converted with opentype.js, the QR traced into merged contours so the plotter doesn't cut between modules), in the sources' colour C60 M40 Y40 K100, even-odd fill. UMO 5 is in the model switch but disabled until it has its own spec.

The guide's Ливрея section (Носители) shows `src/assets/guide/livery-umo8.webp`: the left side with the generator's default dealer («Автодом» over «Центр UMO») and tagline and no guides, rendered from the generator's cut file onto the spec photo (1824×912, the car 84% of the width). Regenerate it if the layout or defaults change.

## Car photos

The car photos shown on the price card live at fixed paths so they can be swapped without touching code:

- `src/assets/umo5-car.jpg` — UMO 5
- `src/assets/umo8-car.jpg` — UMO 8

The exported PDF is printed at A3, and the car photo is meant to hold up at 300dpi — don't shrink it down to "web size." Target **3840×2160 for UMO5** and **3520×1980 for UMO8** (native resolution the car image container needs at 300dpi on an A3 sheet). Export as JPEG quality ~90; that lands each file around 1.5-2 MB. To update a photo, replace the file in place (keep the same filename).

CI (`.github/workflows/ci.yml`) and the deploy workflow both fail the build if any image under `src/` or `public/` exceeds 2.5 MB — high enough for a real 300dpi print asset, low enough to catch a mistake like the raw 13 MB PNG that used to ship here and silently failed to load for users on slow connections.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
