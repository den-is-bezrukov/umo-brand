# umo-brand

React + Vite + Tailwind CSS site for UMO brand materials: the brand guide at `/` and the price-card poster generator at `/price-card` (web preview + print-ready PDF export). Deployed to `umo.autos` via GitHub Pages on every push to `main` (`.github/workflows/deploy.yml`).

## Development Server

Nothing runs automatically — start it yourself:

```bash
pnpm dev
```

This serves the app at `http://localhost:8443` (port set in `vite.config.ts`, not the Vite default). Hot reload is on; changes to source files show up immediately.

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint and router: `/` → `src/guide/Guide.tsx`, `/price-card` → `src/App.tsx` (both lazy-loaded), anything else redirects to `/`
- `src/App.tsx` - Price-card generator page
- `src/guide/Guide.tsx` - Brand guide page (see "Brand guide" below)
- `src/posters/` - Poster components: `PriceCard.tsx` (web preview) and `pdf/PriceCardPdf.tsx` (PDF export), sharing data from `cardData.ts`
- `src/icons/` - SVG path data for the UMO logo/badges and small UI icons, imported directly by component name
- `src/index.css` - Global CSS entrypoint and Tailwind CSS v4 import
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `site.config.json` - Site title/description/favicon/OG-image/robots, applied to the built HTML by the `site-meta` Vite plugin
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

Vector schemes (clear space, minimum size, co-branding, type specimens, model lettering) are SVG files in the same folder — `img()` prefers `<name>.svg` over `<name>.webp`. They are cut out of Figma SVG exports of the parent Body nodes by `scripts/split-figma-svg.py` (node ids and crop boxes are listed at the bottom of the script). Text inside them is outlined by Figma. Photos, logo misuse examples, app/social icons and model posters stay WebP.

The UMO 5 / UMO 8 ad banners in Ключевой образ are `Poster` components: a photo-only background (`<model>-<banner|square>-bg.webp`, about 3x the Figma frame) with the title, subtitle and `UmoYandexLockup` laid over it in container-width units, so text and lockup stay sharp at any size. The backgrounds were cut from the source photos using the layer geometry in Figma; the direct export of the banner photo layers is broken the same way as stretched frames.

Plain "logo on a flat colour" figures are not images: `LogoPlate` in `Guide.tsx` renders `src/guide/UmoLogo.tsx` (inline SVG, `currentColor`) centred on a background, with the logo width given in Figma frame units.

Downloads live in `public/downloads/` and are listed by the `Assets` component in `Guide.tsx`: one row per file (↓, file name, size) or per page of the site (↗, title, path, e.g. the price-card constructor). 1–3 rows stay in one column, 4+ split into two filled top to bottom, so list files grouped by item. Sizes come from the `virtual:download-sizes` module (`downloadSizesPlugin` in `vite.config.ts`), in КБ with a decimal comma; every row of a list gets one decimal as soon as one size is under 10, none otherwise. Each item ships as `<file>.svg` (black) and `<file>-png.zip` (black + white transparent PNGs). `umo-logo` (2400×480) sits under the Логотип figure, `umo-yandex` (the UMO | Яндекс lockup, 2080×400) under Кобрендинг, `umo-model-8` / `umo-model-5` (MODEL 8 / MODEL 5 lettering, 2400×280, exported from the `Vector` layers of Figma frame 4818:1961) under Леттеринг моделей. Keep hairlines as filled rects, not stroked zero-width paths — ImageMagick drops the latter when rasterising. If the logo changes, update `umo-logo.svg` and `UmoLogo.tsx` together, then regenerate the PNGs, e.g. `magick -background none -density 360 umo-logo.svg -resize 2400x480 PNG32:umo-logo-black.png` (swap `fill="black"` for `white` for the white one), and re-zip with `zip -X -j`.

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
