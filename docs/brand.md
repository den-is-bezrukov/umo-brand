# The brand

Everything UMO's own lives in `brand/umo/`; the rest of the code is the core, which takes the brand only from there, through the `@brand/…` alias. `vite.config.ts` points the alias at `brand/<BRAND>` (`umo` unless the `BRAND` variable says otherwise), so another brand is another folder with the same parts. `src/brand.ts` says what each part has to hold; the brand's modules are typed by it. TypeScript checks against `brand/umo` (`tsconfig.json`).

## Parts

- `public/` — the site's root: the fonts, the guide's downloads (`downloads/`), the icons, the social image. The core's own `public/` holds only `404.html`, added to the build by `core-public`.
- `theme.css` — the site's type: the `@font-face` rules and Tailwind's `--font-sans`; `src/index.css` imports it.
- `fonts.ts` — `FONTS`, the type the generators set their files in (in outlines, `src/ui/type.ts`) and their editable templates in (live, `src/ui/liveTextPdf.ts`, the memo's `src/memo/pdf.ts`): the TrueType file and PostScript name of the Regular and the Medium, and `short`, which names them in a PDF's resources. UMO's also has `ALICE`, Alice's mark for the price card.
- `logo.ts` — the wordmark in outlines for the generators: `LOGO` (480×96, the business card, price tag, hours sign) and `NAME_TAG_LOGO`, the name tag's source drawing in the tag's millimetres.
- `Wordmark.tsx`, `HeaderLogo.tsx`, `CobrandLockup.tsx` — the guide's logo: the wordmark on plates, the header's lockup that folds with the scroll (`COBRAND` turns the partner off), the co-branding lockup.

## Checking

Moving something into the brand changes nothing people see: `pnpm check` against a baseline taken before (see «Checking that nothing changed» in `AGENTS.md`).
