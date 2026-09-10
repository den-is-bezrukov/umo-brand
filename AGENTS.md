# umo-brand

React + Vite + Tailwind CSS app for generating UMO price-card posters (web preview + print-ready PDF export). Deployed to `umo.autos` via GitHub Pages on every push to `main` (`.github/workflows/deploy.yml`).

## Development Server

Nothing runs automatically — start it yourself:

```bash
pnpm dev
```

This serves the app at `http://localhost:8443` (port set in `vite.config.ts`, not the Vite default). Hot reload is on; changes to source files show up immediately.

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - Primary application component and the usual starting point for UI work
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
