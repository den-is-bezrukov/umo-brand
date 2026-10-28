# Evrone

The second brand on the core, for trying it without UMO: the business card and the hours sign (`materials` in
`site.json`; the plate frame left out for now, back with `plate-frame` in that list), no dealers or models. `BRAND=evrone pnpm dev` runs it (port 2008 in `.claude/launch.json`).

## Where things come from

- Everything from Evrone's Yandex Disk «04 Identity» and Figma «Evrone Identity».
- The type: Suisse Int'l Book, the one weight, for the generators' files only (`fonts.ts`); cap height 725 of 1000.
- The editor's type (the generators' pages; the guide is in Suisse): Inter (`theme.css`), the closest free match: the same widths within 1% and x-height to
  cap height (0.750 against 0.742), the same neo-grotesque R, G, Q and 1 (Geist rounder and more geometric). Regular
  and Medium where UMO's interface has CoFo Sans Regular and Medium: the release's own `web/Inter-Regular.woff2` and
  `Inter-Medium.woff2`, whole, not cut down (a missing character would turn up only later), its OFL beside them.
- The logo: `01 Logo/evrone-logo-b.svg` (1600×320), cut to its ink, 1600×297.14 (`logo.ts`); the SVGs in `public/downloads`.
- The colours: Figma's «evrone_colors» and evrone.com: black, #ff4400, white, #eeddcc.
- The first screen: `04 Graphics/evrone-back-gradient.jpg`, cropped to 2:1 (`guide/images/hero.webp`).

## Business card

`07 POS/Business Cards/Gurzhii/evrone-bc_iugu.pdf`, 85×55 mm, its text in outlines, measured at 50 px a millimetre:
margins 6; name and surname 12.7 mm (36 pt) on two lines at 100%, the first baseline 15.957; the QR 13×13 at (6, 36);
«Evrone / CMO», email and phone in 4.233 mm (12 pt) from x 23, the first line's capitals on the QR's top, the last
baseline on its bottom (49). The face: the logo 50 mm wide in the middle. The card built here matches the PDF's lines
within 0.03 mm.

## Hours sign

Figma's POS page, «evrone_a4» 1098:150 (black) and 1100:314 (white), 10 px a millimetre; 1098:3 is the photo of the
signs they replace, with the phone row these lacked. The black's legal lines were set in Golos Text by mistake: here in
Suisse. Figma sets a line's baseline at (line − 1.297 × size) / 2 + 0.986 × size under its top (the hhea box centred);
the built signs match Figma's render within 0.1 mm.

## Guide

- The texts: from evrone.ru (main page, «О нас»: the descriptor, the mission, the clients, the services) and evrone.com
  («About»: the purpose behind Видение), the Instagram profile's line for the tone; adapted from UMO's chapters. Brandfetch
  wouldn't open (a bot check).
- The pictures: Figma «Evrone Identity» frames exported at 1x and cut to 2:1 or 4:3 (1110:2 positioning, 1445:150 team,
  1348:5 audience, 1468:5 voice, 1468:23 and 1468:28 the examples, 1185:1235 the stand, 314:4 the poster, 138:133,
  138:144, 138:129 the events, 1360:12, 1360:18, 1348:7, 1360:15, 1373:24 the characters); the card from
  evrone-bc_iugu.pdf; the backgrounds and service icons from Yandex Disk «04 Graphics».
- Drawn from the logo by a script (fontTools, the text in outlines): `clearspace.svg` (the logo's height, an «e», on
  every side), `minsize.svg` (≥20 mm, ≥40 px, as UMO's), `font-inter.svg`, `font-helvetica.svg` and `font-arial.svg`
  (the alternatives in their own Regular; Helvetica and Arial as figma.site lists them), the eight `misuse-*.svg`.
- The icons in `public/downloads` are Figma's 12:23 and 12:21; the orange one recoloured from #FF5533 to the brand's
  #FF4400. It is also the site's favicon.
