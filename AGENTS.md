# umo-brand

React + Vite + Tailwind CSS site for UMO brand materials, [umo.autos](https://umo.autos): the brand guide at `/` and seven generators that make print files for dealers in the browser — the price card (`/price-card`, an A3 poster), the dealer livery (`/livery`, a demo car's cut files), the number plate frame (`/plate-frame`), the name tag (`/name-tag`), the business card (`/business-card`), the price tag (`/price-tag`, eight to an A4 sheet) and the hours sign (`/hours-sign`). No backend.

This file describes the project as it is now. The history of decisions (what was tried and dropped) lives in commit messages, not here; keep only a short «not X» where a dropped option is likely to be proposed again.

## Read before working

This file holds only what every task needs. The details live in `docs/`, one file per area; read the ones your task touches before changing anything, and keep them up to date as you go (describe what you changed, as it is now, in the file it belongs to):

- `docs/guide.md` — the brand guide: grid and rhythm, chapters, first screen, navigation, downloads, favicon, the UMO Sans page
- `docs/generators.md` — what all generators share: the form, the phone layout, item lists, links with settings, files dropped back, name checks, obscene words, Metrika goals. Read it for any generator task
- `BACKLOG.md` — what's parked for later, in Russian; when a task from it is done, remove its line in the same commit
- `docs/price-card.md`, `docs/livery.md`, `docs/plate-frame.md`, `docs/name-tag.md`, `docs/business-card.md`, `docs/price-tag.md`, `docs/hours-sign.md` — each generator's layout in mm, its Figma nodes, texts, limits and file

## Development Server

Nothing runs automatically — start it yourself:

```bash
pnpm dev
```

This serves the app at `http://localhost:8443` (port set in `vite.config.ts`, not the Vite default). Hot reload is on.

`pnpm dev:follow` (`scripts/dev-follow.mjs`) does the same and also pulls the current branch every 10 seconds (fast-forward only, reinstalling dependencies when the lockfile changes), so changes pushed to it show up in the open page.

## Deploy and releases

Every push to `main` builds the site and publishes it to GitHub Pages (`.github/workflows/deploy.yml`), so a push to `main` is a production deploy. CI (`.github/workflows/ci.yml`) checks types and the build. Both fail on any image under `src/` or `public/` over 2.5 MB and any `.mp4`/`.webm` over 15 MB.

Webvisor replays a visit with its stylesheet fetched from the site at viewing time, and each deploy replaces the hashed CSS, so the deploy carries the stylesheets of the last 15 days over from the live site, listed in `css-archive.txt` with the last time each was current.

Releases are [GitHub Releases](https://github.com/den-is-bezrukov/umo-brand/releases), tagged `MM-YYYY` (`09-2026.2` for a second one in a month), with short notes.

## Project Structure

Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint and router: `/` → `src/guide/Guide.tsx`, `/umo-sans` → `src/guide/SansGuide.tsx` (`/golos` redirects there), `/price-card` → `src/App.tsx`, `/livery` → `src/Livery.tsx`, `/plate-frame` → `src/PlateFrame.tsx`, `/name-tag` → `src/NameTag.tsx`, `/business-card` → `src/BusinessCard.tsx`, `/price-tag` → `src/PriceTag.tsx`, `/hours-sign` → `src/HoursSign.tsx` (all lazy-loaded), anything else redirects to `/`. `MetrikaHits` here sends a Metrika view per page path
- `src/guide/` - The brand guide (`Guide.tsx`, `UmoLogo.tsx`) and `SansGuide.tsx`, the guide set in UMO Sans (see `docs/guide.md`)
- `src/App.tsx` - The price card generator; its posters in `src/posters/` (`PriceCard.tsx` web preview, `pdf/PriceCardPdf.tsx` PDF, data from `cardData.ts`)
- `src/Livery.tsx` - The livery generator; `src/livery/`: surfaces in mm (`layout.ts`: `UMO8`, `UMO5`, `LIVERIES`), outlines (`geometry.ts`), the wordmark with the 8 and the 5 (`logo.ts`), the PDF/zip (`pdf.ts`)
- `src/PlateFrame.tsx` - The plate frame generator; `src/plate/`: the print strip (`frame.ts`: `STRIP`, `buildStrip`), its PDF (`pdf.ts`), the plate in its frame (`PlateArt.tsx`, also the guide's picture)
- `src/NameTag.tsx` - The name tag generator; `src/nametag/`: the tag (`tag.ts`: `TAG`, `LOGO`, `buildTag`), the spreadsheet reader (`table.ts`; `xlsxCells` / `pastedCells` and `byHeaders` read any columns, which the other lists use), its zip (`pdf.ts`), the preview (`TagArt.tsx`)
- `src/BusinessCard.tsx` - The business card generator; `src/card/`: the layout, phone format and vCard (`card.ts`: `CARD`, `buildBack`, `formatPhone`, `vcard`), its PDF (`pdf.ts`), the preview (`CardArt.tsx`)
- `src/PriceTag.tsx` - The price tag generator; `src/pricetag/`: the tag (`tag.ts`: `TAG`, `buildTag`, `readPrice`), the A4 sheets (`pdf.ts`), the Word file (`docx.ts`), both read back (`read.ts`)
- `src/HoursSign.tsx` - The hours sign generator; `src/hours/`: the layout (`sign.ts`), the PDF (`pdf.ts`)
- `src/ui/` - What the generators share (see `docs/generators.md`): the form (`form.tsx`), the phone layout (`mobile.tsx`, `phone.ts`), item lists (`staff.tsx`), settings in the link (`share.ts`), data in the PDF (`pdfData.ts`, `pdfDataWrite.ts`), name checks (`names.ts`), obscene words (`profanity.ts`), Metrika goals (`metrika.ts`)
- `src/data/` - The texts the generators suggest: the livery's taglines (`taglines.ts`), the positions (`positions.ts`), the dealers (`dealers.ts`: `dealers.json` and the hand-kept `dealers-own.json` merged, and `findDealers`, which finds one by any spelling; see «Dealers» in `docs/generators.md`), the hours sign's lines and umo.auto's hours (`hours.ts`)
- `src/data/dealers.json` - UMO dealers as umo.auto lists them (name, city, short address, coordinates, hours, models); their marketing names («UMO АГАТ Владимир», `DEALER_NAMES`) are the dealer suggestions. Collected by `node scripts/fetch-dealers.mjs`, which opens a booking draft per model on umo.auto and switches it through every city (the page's `updateFormValues` server action, its id found in the page's scripts); run it by hand and review the changes with `git diff`
- `src/icons/` - SVG path data for the UMO logo/badges and small UI icons, imported directly by component name
- `src/index.css` - Global CSS entrypoint, Tailwind CSS v4 import, fonts
- `index.html` - Vite HTML shell. On iOS only, a script adds `maximum-scale=1` to the viewport: iOS Safari zooms into any field under 16px on focus and doesn't zoom back, while still allowing a pinch zoom; on Android the same setting would block pinching. It also holds the Yandex.Metrika counter (113514674), loaded on umo.autos only, `defer`
- `site.config.json` - Site title/description/favicon/OG-image/robots, applied to the built HTML by the `site-meta` Vite plugin (the icons: see `docs/guide.md`)
- `vite.config.ts` - Vite configuration: React, Tailwind CSS v4, the `@` alias for `src`, the `site-meta` plugin and `virtual:download-sizes`

## Dependencies

- Runtime: React 19 and React DOM 19; `@react-pdf/renderer` and `pdf-lib` for PDF, `opentype.js` for text in outlines, `qrcode`, `fflate` for .xlsx and zips, `typograf`
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. No Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`. Keep CSS `@import` statements first, then any `@font-face` rules and font-family defaults.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
