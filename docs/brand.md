# The brand

Everything UMO's own lives in `brand/umo/`; the rest of the code is the core, which takes the brand only from there, through the `@brand/…` alias. `vite.config.ts` points the alias at `brand/<BRAND>` (`umo` unless the `BRAND` variable says otherwise), so another brand is another folder with the same parts. `src/brand.ts` says what each part has to hold; the brand's modules are typed by it. TypeScript checks against `brand/umo` (`tsconfig.json`).

## Parts

- `public/` — the site's root: the fonts, the guide's downloads (`downloads/`), the icons, the social image. The core's own `public/` holds only `404.html`, added to the build by `core-public`.
- `theme.css` — the site's type and greys: the `@font-face` rules, Tailwind's `--font-sans`, and the colour tokens the whole site is drawn with, `surface` (backgrounds, #f5f5f5), `line` (hairlines, #e6e6e6), `caption` (captions and quiet text, #808080), as classes `bg-surface`, `border-line`, `text-caption`; `src/index.css` imports it.
- `colors.ts` — `COLORS`, the guide's Цвет: the main colours in large tiles, the service ones in small, each with its values (screen, print).
- `fonts.ts` — `FONTS`, the type the generators set their files in (in outlines, `src/ui/type.ts`) and their editable templates in (live, `src/ui/liveTextPdf.ts`, the memo's `src/memo/pdf.ts`): the TrueType file and PostScript name of the Regular and the Medium, and `short`, which names them in a PDF's resources. UMO's also has `ALICE`, Alice's mark for the price card.
- `logo.ts` — the wordmark in outlines for the generators: `LOGO` (480×96, the business card, price tag, hours sign) and `NAME_TAG_LOGO`, the name tag's source drawing in the tag's millimetres.
- `guide/` — the guide's content: `index.tsx` holds the chapters in the contents (`CHAPTERS`, before the core's Материалы and Контакты), old anchors, the first screen (`HERO`, `STATEMENT`), Материалы' lead, order and pictures (`MATERIALS_LEAD`, `INTRO_ORDER`, `DRAWN`), the chapters themselves (`Chapters`, written with `src/guide/parts.tsx`), Контакты' text and the footer; `images/` the pictures and the film, `images.ts` their list for `img()`.
- `assets/` — the generators' pictures: the cars for the price card, the livery's sides, the memo's pages (taken out of Figma by `scripts/fetch-memo.mjs`, with the memo's texts, `memo/texts.json`).
- `points.ts` — `POINTS`, the points of sale (dealers): lists merged in order (`points/site.json` from umo.auto by `scripts/fetch-dealers.mjs`, the hand-kept `points/own.json`), the prefix every name starts with («UMO»), the brand's name as people write it; `src/data/points.ts` merges and searches them.
- `Wordmark.tsx`, `HeaderLogo.tsx`, `CobrandLockup.tsx` — the guide's logo: the wordmark on plates, the header's lockup that folds with the scroll (`COBRAND` turns the partner off), the co-branding lockup.

## Checking

Moving something into the brand changes nothing people see: `pnpm check` against a baseline taken before (see «Checking that nothing changed» in `AGENTS.md`).
