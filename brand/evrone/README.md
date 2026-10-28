# Evrone

The second brand on the core, for trying it without UMO: the business card, the hours sign and the plate frame
(`materials` in `site.json`), no dealers or models. `BRAND=evrone pnpm dev` runs it (port 5589 in `.claude/launch.json`).

## Where things come from

- Everything from Evrone's Yandex Disk «04 Identity» and Figma «Evrone Identity».
- The type: Suisse Int'l Book, the one weight (`fonts.ts`, `theme.css`); cap height 725 of 1000.
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
