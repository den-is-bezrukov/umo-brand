# Price card (`/price-card`)

`src/App.tsx`, the card in `src/pricecard/`. An A3 poster laid out as Figma's «Price Cards» section (file `UMO | Evrone`): 2100×2970 px, 7.07 px a millimetre, and `card.ts` works in those px, y down. Built as the other generators are: text in outlines through opentype.js (`src/ui/type.ts`), the preview (`CardArt.tsx`, an SVG) and the PDF (`pdf.ts`, pdf-lib) drawn from the same outlines (`buildCard`). Not react-pdf: the card was on it until the 2026-10 layout, two layouts kept in sync by hand and a patched textkit.

## Layout, px

- Band 0–720: the trim's photo fills its box (`TRIMS[…].photo.box`: the photo itself, cut to the band and 3 mm, 21.2 px, round it), cut to the band (`photoRect`). On it in white: the wordmark with the model's number, 525×75 at (125, 125), Figma's paths (`UMO`, `NUMBER`); «от … ₽», 75 px on a 56.25 px line whose top is at 539.
- From 820, 125 px sides (column 1850): the headline, 150 px on 150, Figma's lines as written (`MODELS[…].headline`), Alice's mark in purple #7a55ff from Alice Okniks (the `@`; ss02 is set in Figma but the font has none, so it's the plain mark); 100 under it «Комплектация …:», 75 on 75; 50 under that the list, 75 on 75 with 25 between, the text at 200, the bullet (CoFo's •) hung at 131.
- From the bottom margin (2870) up: the fine print, CoFo Sans Regular 25 on 25, #808080, wrapped across the column; 75 over it the prices' row, 200 tall: «Полная стоимость» 50 on 50, 75 under the row's top the cost 125 on 125 (empty, a grey 9 999 999); «Ежемесячный платёж» 125 after the price, on UMO 8 only; the QR 200×200 at x 1775 on the row's top, no quiet zone. With no fine print the row stands on a 125 px margin, as wide as the sides. A longer fine print lifts the row; it may come up to 75 px under the list («Сноска слишком длинная» past that). Ultra's default stands at the limit.
- Figma's baseline: (line − 1.26 em) / 2 + 0.974 em under a line's top (`baseline`).
- Prices' figures lining and tabular (`lnum`, `tnum`), as in Figma.

## Texts and prices

Per trim in `PRICE_CARD.trims` (`brand/umo/price-card.ts`, read by `card.ts` as `TRIMS`; the models themselves, their names and pages, are `brand/umo/models.ts`): the name, the list, «от …», the full cost as it comes, the monthly payment, the fine print as it comes, word for word from Figma but its forced line breaks, set through the guide's typograph (`typografText` in `src/guide/typograf.ts`: short words, a sentence's first word and a paragraph's last held to the next) with numbers kept whole and «ст.» held to its number (two typos fixed in the lists: «сидений», «Адаптивное управление»). «от …» in the band is the trim bare, fixed; «Полная стоимость» at the bottom is the car as it stands, the trim's price and the equipment the dealer adds, which the law asks to be shown whole: the dealer's to set, the trim's price by default, never under it («Стоимость ниже цены»). The monthly payment is fixed. Not «Розничная цена» (it read as a second, same price). «от …» is the trim's own price (Figma had UMO 5 Pro's at 3 440 000, Max's).

## The form

Model, trim, the QR's link, «Полная стоимость, ₽» (follows the trim until edited, `fullSet`), «Сноска» (a textarea, at most 240 px tall, then it scrolls). The fine print follows the trim until edited (`legalSet`); switching the model brings the model's own back (UMO 8's carries its credit terms). Faults (`firstIssue`): the QR's link, the full cost (empty, under the trim's price), then the card's own (`buildCard`'s `issues`: too long, a character CoFo lacks, an obscene word). The QR leads to the model's page by default (`DEFAULT_URL`), and switching models swaps it while it's still the old model's page.

The page holds several cards (`useStaff` with no table mode, opened with the link's cards through `initial`): one always selected, each fitting the canvas's height on wide screens; a card's «Сбросить» brings it back to its model's defaults; «Добавить», the plus in the card's column (⌘↩), adds a copy of the last card. «Скачать» gives one PDF, an A3 page per card, RGB as the photo, no bleed (one card is `UMO-8-MAX.pdf`, several `UMO_price-cards.pdf`). pdf-lib loads on the first download or share. On phones model and trim share a row while each is at least 180 px wide.

## Photos

Each trim has its own, two files: the full JPEG for the PDF and a 1600 px WebP for the preview (`*-car-preview.webp`, `cwebp -q 80 -resize 1600 0`), all Figma's own, cut to what the band shows and 3 mm round it at the photo's own resolution (no more is kept: the four were 5.6 MB uncut, 2 MB cut). UMO 8 Max `umo8-car.jpg` 2286×814, Ultra `umo8-ultra-car.jpg` 2744×977, UMO 5 Pro `umo5-car.jpg` and Max `umo5-max-car.jpg` 3902×1389 (Max cut 3 px lower, from +15+669: its car stands that much lower in Figma's photo, and switching the trims it jumped) (the shorter names are the first trims'). Figma's boxes for the uncut photos, from which the cuts were made: UMO 8 Max (−30, −350) 2560×1440 over 2752×1536, Ultra (−200, −330) 2400×1200 over 3084×1536 (Figma's top layer; the earlier photo lies under it), UMO 5 (−30, −350) 2250×1181 over 4096×2286. A new photo: cut it the same way (`magick … -crop WxH+X+Y -quality 88`), set its box and `px`, and make the WebP.

The template icon in the card's column, «Скачать прайс-карту», gives that card as it is (`UMO-5-PRO.pdf`). `umo.autos/price-card?t`, the guide's PDF in Материалы, gives `UMO_price-cards.pdf`, every trim as it comes, UMO 5 first (`defaultsPdf`) (see «Editable templates» in `docs/generators.md`).

The guide's picture of the card (Материалы, `PriceCardPreview` in `src/guide/parts.tsx`) is the generator's own `CardArt`: UMO 5 Max at its defaults, built once the guide has loaded the fonts.
