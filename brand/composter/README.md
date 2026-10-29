# Компостер

The demo brand, and the brand of the editor itself: Компостер shows every generator the core has, and its guide is at
once the brand's guide and an explainer of the guide, the brand and the product. Once UMO moves to its own repository,
it becomes the core's default brand. `BRAND=composter pnpm dev` runs it (port 2009 in `.claude/launch.json`). For now:
the business card and the hours sign (`materials` in `site.json`); the rest comes from Figma's sections one by one.
Its points are branches (`words.ts`: «Филиал», «Выбрать филиал»), three made up for the demo (`points.ts`: Москва,
Санкт-Петербург, Казань, «ул. Примерная», 000 phones); no site rule, so a branch's site starts empty, and no line under
the branch's name on the business card.

## Where things come from

- Everything from Figma «Composter» (`uR27qnyVEwhiHqH7zvOmcu`), page Sandbox: Основа (logo, colours, type), Фото, a
  section per material, a section per guide chapter.
- The logo: «КОМПОСТЕР» punched in dots, component `logo` (2:8, its variant 2:4), exported as SVG, 1024×128, 8:1
  (`logo.ts`); the favicon its К (`public/favicon.svg`).
- The type: Inter Regular and Medium, the release's own files, whole (Inter 4.1: `web/` for the site, `extras/ttf/`
  for the files; `Inter-OFL.txt`). Inter has no ligatures and its `ccmp` changes none of the letters the materials set,
  so the core's outlines take each character's own glyph where opentype.js can't read that `ccmp` (`glyphsOf`).
- The colours: Основа · Цвет: black and white, the greys as service colours; the print black C60 M40 Y40 K100.
- The editor in Composter's style (`editor.css`, from Composter's `src/style.css`, github.com/den-is-bezrukov/composter):
  on wide screens a 240 px panel in Inter 11/16, every field a block with a hairline over it and a 40 px heading in
  Medium, controls 32 px, the crumbs grey over the generators' names in 13/22; the text black at 90%, captions 50%,
  placeholders 30%, the main button #ff5c16 (#e84f0c on hover), errors #f24822, a 1 px blue focus (#0d99ff), windows
  13 px round. On a phone the core's layout in these colours. The editor's crumb «Редактор» (`editor` in `site.json`),
  as the panel is narrow.
- The guide: the first screen (Первый экран · hero, an Unsplash photo) and the logo (Логотип · logo), 1824 px WebP.
- The site's settings are placeholders until it has a home: `composter.example`.

## Business card

UMO's layout, set in Inter (Визитка, 10 px a millimetre): its capitals 0.7275 of the size; Figma sets Inter on 100% lines
with the baseline 0.864 of the size under a box's top, so the dealership's capitals hang from the 5 mm margin and the
phone stands on it, as UMO's. The face white or black, the logo 40.96 mm wide at 5, 37; the back's logo 15.36 mm wide at
70, 5; the QR 15×15 at 70, 30.

## Hours sign

UMO's plate, 480×680 mm (Режимник, 5 px a millimetre), in Inter: the logo across the column, the hours 58.5 mm (−0.85%)
on a baseline of 370 mm, «Работаем без выходных» 31.1 mm (−0.8%; Regular in Figma, Medium here as the core sets the
sign), the dealership 9.14 mm on 1.5 lines standing on 611.6 mm. The hours by a slider, 9:00–21:00 to start with.
