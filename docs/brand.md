# The brand

Everything a brand's own lives in its folder, `brand/<name>/`; the rest of the code is the core, which takes the brand only from there, through the `@brand/…` alias, and names no brand. `vite.config.ts` points the alias at `brand/<BRAND>` (package.json's `brand` unless the `BRAND` variable says otherwise), so another brand is another folder with the same parts. `src/brand.ts` says what each part has to hold; the brand's modules are typed by it. TypeScript checks every brand's folder against the default brand's types (`tsconfig.json`'s `@brand`, the one place besides package.json that names it). What is the brand's alone, and how its parts were made, is in the brand's own `README.md`.

The core is written as if every brand were a client: no brand's name, font, site, dealers or Figma file in the core's code, comments, docs or skills; examples say «<Бренд>», «Дилер Город», `<Brand>_price-tags.pdf`, «the brand font».

## Parts

- `public/` — the site's root: the fonts, the guide's downloads (`downloads/`), the icons, the social image. The core's own `public/` holds only `404.html`, added to the build by `core-public`.
- `theme.css` — the site's type and greys: the `@font-face` rules, Tailwind's `--font-sans`, and the colour tokens the whole site is drawn with, `surface` (backgrounds, #f5f5f5), `line` (hairlines, #e6e6e6), `caption` (captions and quiet text, #808080), as classes `bg-surface`, `border-line`, `text-caption`; `src/index.css` imports it.
- `colors.ts` — `COLORS`, the guide's Цвет: the main colours in large tiles, the service ones in small, each with its values (screen, print).
- `fonts.ts` — `FONTS`, the type the generators set their files in (in outlines, `src/ui/type.ts`) and their editable templates in (live, `src/ui/liveTextPdf.ts`, the memo's `src/memo/pdf.ts`): the TrueType file and PostScript name of the Regular and the Medium, `family`, the type's name as people know it (the instructions say to install it for the templates), and `short`, which names them in a PDF's resources.
- `logo.ts` — the wordmark in outlines for the generators: `LOGO` (480×96, the business card, price tag, hours sign) and `NAME_TAG_LOGO`, the name tag's source drawing in the tag's millimetres.
- `guide/` — the guide's content: `index.tsx` holds the chapters in the contents (`CHAPTERS`, before the core's Материалы and Контакты), old anchors, the first screen (`HERO`, `STATEMENT`), Материалы' lead, order and pictures (`MATERIALS_LEAD`, `INTRO_ORDER`, `DRAWN`), the chapters themselves (`Chapters`, written with `src/guide/parts.tsx`), Контакты' text and the footer; `images/` the pictures and the film, `images.ts` their list for `img()`.
- `assets/` — the generators' pictures: the cars for the price card, the livery's sides, the memo's pages (with the memo's texts, `memo/texts.json`).
- `points.ts` — `POINTS`, the points of sale (dealers): lists merged in order (where they come from is the brand's), the prefix every name starts with (the brand's name), the brand's name as people write it; `src/data/points.ts` merges and searches them.
- `site.json` — the site's settings, `SITE` (`src/site.ts`): `name` («Бренд <Бренд>», «Ценник <Бренд>»), `file` (the files' prefix, <Brand>_price-tags.pdf), `domain` (where the site lives: the instructions' links, Metrika's host), `home` (the brand's own site: a QR's default, the dealers' sites under it), `support` (the bot), `metrika` (the counter, none for none), and the HTML's title, description, language, robots, icons and social image, which `vite.config.ts` reads.
- `models.ts` — `MODELS`, the models: id (in links and data), name («<Бренд> 5», also on files: <Brand>-5-PRO.pdf, <Brand>5_dealer-livery.zip), page (a QR's default); the first is the default; `src/data/models.ts` reads them.
- `price-card.ts` — `PRICE_CARD`, what the price card says per model: the headline (a run may have its own font and colour), the wordmark with the model's number, the trims with their photos, prices, lists and fine print; `src/pricecard/card.ts` lays it out.
- `taglines.ts` — the livery's slogans per model, the default first.
- `livery.ts`, `lettering.ts` — `LIVERY`, the livery's cars: the wordmark (600×120) and per model the surfaces in mm (sides and rear window, QR, lettering, text zones, obstacles, photos, spec dimensions), the model numbers' outlines in `lettering.ts`; `src/livery/surface.ts` holds the mechanics and the types they're written in.
- `Wordmark.tsx`, `HeaderLogo.tsx`, `CobrandLockup.tsx` — the guide's logo: the wordmark on plates, the header's lockup that folds with the scroll (`COBRAND` turns the partner off; `setLogoFold` folds it by script, its layers' moves in the brand's `theme.css`), the co-branding lockup.
- `check.mjs` — the check's scenarios on the brand's data (`SCENARIOS`, `TABLES`, read by `scripts/check.mjs`).
- `README.md` — the brand's own notes: its numbers and how its parts were made.

## Checking

Moving something into the brand changes nothing people see: `pnpm check` against a baseline taken before (see «Checking that nothing changed» in `AGENTS.md`). The baseline is from 87b0d0a, the code before the brand moved; a scenario added since takes its baseline from there too: `node scripts/check.mjs --baseline --baseline-from=87b0d0a --only=<scenario>`.
