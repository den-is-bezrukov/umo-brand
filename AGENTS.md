# umo-brand

React + Vite + Tailwind CSS site for UMO brand materials, [umo.autos](https://umo.autos): the brand guide at `/` and eight generators that make print files for dealers in the browser — the price card (`/price-card`, an A3 poster), the dealer livery (`/livery`, a demo car's cut files), the number plate frame (`/plate-frame`), the name tag (`/name-tag`), the business card (`/business-card`), the price tag (`/price-tag`, eight to an A4 sheet) the hours sign (`/hours-sign`) and the owner's memo (`/memo`, two A4 pages, also as an editable template). No backend.

This file describes the project as it is now. The history of decisions (what was tried and dropped) lives in commit messages, not here; keep only a short «not X» where a dropped option is likely to be proposed again.

## Read before working

This file holds only what every task needs. The details live in `docs/`, one file per area; read the ones your task touches before changing anything, and keep them up to date as you go (describe what you changed, as it is now, in the file it belongs to):

- `docs/guide.md` — the brand guide: grid and rhythm, chapters, first screen, navigation, downloads, favicon
- `docs/brand.md` — where the brand lives (`brand/umo/`), what the code takes from it and how; read it before touching anything UMO's own: logo, fonts, texts, dealers, models, photos
- `docs/generators.md` — what all generators share: the form, the phone layout, item lists, links with settings, files dropped back, name checks, obscene words, Metrika goals. Read it for any generator task
- `BACKLOG.md` — what's parked for later, in Russian; when a task from it is done, remove its line in the same commit
- `docs/price-card.md`, `docs/livery.md`, `docs/plate-frame.md`, `docs/name-tag.md`, `docs/business-card.md`, `docs/price-tag.md`, `docs/hours-sign.md`, `docs/memo.md` — each generator's layout in mm, its texts, limits and file

## Development Server

One server is always running at `http://localhost:5588` (port set in `vite.config.ts`, not the Vite default), started at login by the LaunchAgent `~/Library/LaunchAgents/autos.umo.dev.plist` (`pnpm dev` in this folder; log in `~/Library/Logs/umo-dev.log`). Hot reload is on. Don't start another one: open it with `preview_start {name: "dev"}`, which only attaches to that URL. If it's down, `launchctl kickstart -k gui/$(id -u)/autos.umo.dev` restarts it.

## Checking that nothing changed

`pnpm check` (`scripts/check.mjs`) shows a change of code changed nothing people see: it builds the site into `.check.nosync/build`, serves it itself, and a headless Chrome (Playwright's headless shell when it's there, as it doesn't update itself) goes through the guide and every generator on set data (defaults, `?t`, `pdf=1` links, a long dealer's name, lists from tables it makes itself, cases the checks stop, and what a person does by hand: picking a dealer from the suggestions, switching model and trim, the template icon, a downloaded PDF or ZIP dropped back, the phone's contents), saving each page's text, screenshots at 1440×900 and 350×622 (the guide screen by screen) and the files downloaded. Against the baseline (`pnpm check:baseline`, from the code as it is before the change) it writes `.check.nosync/report.txt`, «Совпало» or what differs where, with pictures of the differences in `.check.nosync/diff`. PDFs count as the same when their content is, dates aside, else page by page as pictures (`pdftoppm`, ImageMagick's `compare`). `--only=livery,guide` takes a part; `--baseline-from=<commit>` takes the baseline from that commit's code, in a worktree of it, for a scenario added later. `.check.nosync/` stays out of git (and, by its name, out of iCloud, which duplicated the files it rewrites as «… 2»).

## Deploy and releases

Every push to `main` builds the site and publishes it to GitHub Pages (`.github/workflows/deploy.yml`), so a push to `main` is a production deploy. CI (`.github/workflows/ci.yml`) checks types and the build. Both fail on any image under `src/` or `public/` over 2.5 MB and any `.mp4`/`.webm` over 15 MB.

Webvisor replays a visit with its stylesheet fetched from the site at viewing time, and each deploy replaces the hashed CSS, so the deploy carries the stylesheets of the last 15 days over from the live site, listed in `css-archive.txt` with the last time each was current.

Releases are [GitHub Releases](https://github.com/den-is-bezrukov/umo-brand/releases), tagged `MM-YYYY` (`09-2026.2` for a second one in a month), with short notes.

## Project Structure

Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `brand/umo/` - Everything UMO's own, which the code takes through `@brand/…` (see `docs/brand.md`): the site's root files (`public/`: fonts, downloads, icons), the type (`theme.css`, `fonts.ts`), the logo (`logo.ts`, the guide's `Wordmark.tsx`, `HeaderLogo.tsx`, `CobrandLockup.tsx`), the colours (`colors.ts`), the guide's chapters, texts, pictures and film (`guide/`), the generators' pictures (`assets/`), the dealers (`points.ts`, `points/`), the memo's texts (`memo/`), the scripts that collect them from umo.auto and Figma (`scripts/`). `src/brand.ts` says what each part holds; `brand/<name>/` for another brand, `BRAND=<name>` to build with it
- `src/main.tsx` - React entrypoint and router: `/` → `src/guide/Guide.tsx`, `/price-card` → `src/App.tsx`, `/livery` → `src/Livery.tsx`, `/plate-frame` → `src/PlateFrame.tsx`, `/name-tag` → `src/NameTag.tsx`, `/business-card` → `src/BusinessCard.tsx`, `/price-tag` → `src/PriceTag.tsx`, `/hours-sign` → `src/HoursSign.tsx`, `/memo` → `src/Memo.tsx`, `/editor` → the guide with the Редактор window (every generator) open (all lazy-loaded), anything else redirects to `/`. `MetrikaHits` here sends a Metrika view per page path
- `src/guide/` - The brand guide's page (`Guide.tsx`) and the blocks its sections are written with (`parts.tsx`); UMO's chapters and texts are `brand/umo/guide/`; UMO Sans, the font tried on it, lives in its own project (`../umo-sans`), not here
- `src/App.tsx` - The price card generator; `src/pricecard/`: the card's layout (`card.ts`: `CARD`, `buildCard`; UMO's headlines, wordmarks, trims, prices and fine print are `brand/umo/price-card.ts`), the A3 PDF (`pdf.ts`), the preview (`CardArt.tsx`, also the guide's picture)
- `src/Livery.tsx` - The livery generator; `src/livery/`: the surfaces' mechanics in mm (`surface.ts`: types, `withoutQr`, `smallQr`, `mirrorObstacle`; `layout.ts` adds the brand's cars as `LIVERIES`), outlines (`geometry.ts`); UMO 8 and UMO 5 themselves, their surfaces, photos and lettering, are `brand/umo/livery.ts` and `lettering.ts`, the PDF/zip (`pdf.ts`)
- `src/PlateFrame.tsx` - The plate frame generator; `src/plate/`: the print strip (`frame.ts`: `STRIP`, `buildStrip`), its PDF (`pdf.ts`), the plate in its frame (`PlateArt.tsx`, also the guide's picture)
- `src/NameTag.tsx` - The name tag generator; `src/nametag/`: the tag (`tag.ts`: `TAG`, `LOGO`, `buildTag`), the spreadsheet reader (`table.ts`; `xlsxCells` / `pastedCells` and `byHeaders` read any columns, which the other lists use), its zip (`pdf.ts`), the preview (`TagArt.tsx`)
- `src/BusinessCard.tsx` - The business card generator; `src/card/`: the layout, phone format and vCard (`card.ts`: `CARD`, `buildBack`, `formatPhone`, `vcard`), its PDF (`pdf.ts`), the preview (`CardArt.tsx`)
- `src/PriceTag.tsx` - The price tag generator; `src/pricetag/`: the tag (`tag.ts`: `TAG`, `buildTag`, `readPrice`), the A4 sheets (`pdf.ts`), read back (`read.ts`)
- `src/HoursSign.tsx` - The hours sign generator; `src/hours/`: the layout (`sign.ts`), the PDF (`pdf.ts`)
- `src/Memo.tsx` - The owner's memo generator; `src/memo/`: the contacts and Figma's art read back (`memo.ts`), the texts set as Figma sets them (`text.ts`, from `texts.json`), the PDF and the template (`pdf.ts`); Figma's pages in outlines in `brand/umo/assets/memo`, both taken out by `brand/umo/scripts/fetch-memo.mjs`
- `src/ui/` - What the generators share (see `docs/generators.md`): the form (`form.tsx`), the dealer a `pdf` link names found before the generator reads it (`LinkDealer.tsx`), the phone layout (`mobile.tsx`, `phone.ts`), item lists (`staff.tsx`), settings in the link (`share.ts`), data in the PDF (`pdfData.ts`, `pdfDataWrite.ts`), name checks (`names.ts`), obscene words (`profanity.ts`), Metrika goals (`metrika.ts`), the editable templates' button and link (`template.tsx`) and live text (`liveText.ts`, its PDF half `liveTextPdf.ts`), text in outlines and the fonts (`type.ts`)
- `src/data/` - Every generator's path and name (`generators.ts`: the ring, «Инструкция», the guide's «Редактор материалов», its Материалы cards and first sentence, the template icon's tooltip; add a new generator there); the brand's models as the generators choose them (`models.ts`, from `@brand/models`); the texts the generators suggest: the positions (`positions.ts`), the dealers, the brand's points of sale (`points.ts`: `@brand/points` merged, and `findDealers`, which finds one by any spelling; see «Dealers» in `docs/generators.md`), the hours sign's lines and umo.auto's hours (`hours.ts`)
- `brand/umo/points/` - UMO dealers: `site.json` as umo.auto lists them (name, city, short address, coordinates, hours, models), collected by `node brand/umo/scripts/fetch-dealers.mjs`, which opens a booking draft per model on umo.auto and switches it through every city (the page's `updateFormValues` server action, its id found in the page's scripts; run it by hand and review the changes with `git diff`), and the hand-kept `own.json`; their marketing names («UMO АГАТ Владимир», `DEALER_NAMES`) are the dealer suggestions
- `src/icons/` - SVG path data for the UMO logo and small UI icons, imported directly by component name
- `src/index.css` - Global CSS entrypoint, Tailwind CSS v4 import, the brand's `theme.css`
- `index.html` - Vite HTML shell. On iOS only, a script adds `maximum-scale=1` to the viewport: iOS Safari zooms into any field under 16px on focus and doesn't zoom back, while still allowing a pinch zoom; on Android the same setting would block pinching. It also holds the Yandex.Metrika counter, the brand's (`metrika` in `site.json`, put in by `site-meta`; none, and the counter goes), loaded on the brand's domain only, `defer`
- `brand/umo/site.json` - The site's settings (`src/site.ts`, `SITE`): the brand's name and files' prefix, the site's domain, the brand's own site, the support bot, the Metrika counter, and the HTML's title, description, icons, OG image and robots, applied to the built HTML by the `site-meta` Vite plugin (the icons: see `docs/guide.md`)
- `vite.config.ts` - Vite configuration: React, Tailwind CSS v4, the `@` alias for `src` and `@brand` for the brand's folder (its `public/` the site's root, the core's `public/`, 404.html, added by `core-public`), the `site-meta` plugin and `route-pages`, which copies `index.html` to each generator's path (`memo.html`, from `src/data/generators.ts`, and `editor.html`) so GitHub Pages answers them with a 200 rather than `public/404.html`'s redirect, which link previews and search engines read as a missing page

## Dependencies

- Runtime: React 19 and React DOM 19; `pdf-lib` for PDF (`@pdf-lib/fontkit` to embed the brand's type in the editable templates, loaded with a template only), `opentype.js` for text in outlines, `qrcode`, `fflate` for .xlsx and zips, `typograf`
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. No Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, which imports the brand's `theme.css`: the brand's `@font-face` rules and `--font-sans` belong there. Keep CSS `@import` statements first.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
