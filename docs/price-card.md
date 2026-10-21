# Price card (`/price-card`)

`src/App.tsx`, the card in `src/pricecard/`. An A3 poster laid out as the brand's Figma «Price Cards» section: 2100×2970 px, 7.07 px a millimetre, and `card.ts` works in those px, y down. Built as the other generators are: text in outlines through opentype.js (`src/ui/type.ts`), the preview (`CardArt.tsx`, an SVG) and the PDF (`pdf.ts`, pdf-lib) drawn from the same outlines (`buildCard`). Not react-pdf: the card was on it until the 2026-10 layout, two layouts kept in sync by hand and a patched textkit.

## Layout, px

- Band 0–720: the trim's photo fills its box (`TRIMS[…].photo.box`: the photo itself, cut to the band and 3 mm, 21.2 px, round it), cut to the band (`photoRect`). On it in white: the wordmark with the model's number, 525×75 at (125, 125), the brand's paths (`PRICE_CARD.lettering`); «от … ₽», 75 px on a 56.25 px line whose top is at 539.
- From 820, 125 px sides (column 1850): the headline, 150 px on 150, Figma's lines as written (`PRICE_CARD.headlines`), a run in its own font and colour where it has them; 100 under it «Комплектация …:», 75 on 75; 50 under that the list, 75 on 75 with 25 between, the text at 200, the bullet (the brand font's •) hung at 131.
- From the bottom margin (2870) up: the fine print, the brand font Regular 25 on 25, #808080, wrapped across the column; 75 over it the prices' row, 200 tall: «Полная стоимость» 50 on 50, 75 under the row's top the cost 125 on 125 (empty, a grey 9 999 999); «Ежемесячный платёж» 125 after the price, where the trim has one; the QR 200×200 at x 1775 on the row's top, no quiet zone. With no fine print the row stands on a 125 px margin, as wide as the sides. A longer fine print lifts the row; it may come up to 75 px under the list («Сноска слишком длинная» past that). Ultra's default stands at the limit.
- Figma's baseline: (line − 1.26 em) / 2 + 0.974 em under a line's top (`baseline`).
- Prices' figures lining and tabular (`lnum`, `tnum`), as in Figma.

## Texts and prices

Per trim in `PRICE_CARD.trims` (`brand/<name>/price-card.ts`, read by `card.ts` as `TRIMS`; the models themselves, their names and pages, are `brand/<name>/models.ts`): the name, the list, «от …», the full cost as it comes, the monthly payment, the fine print as it comes, word for word from Figma but its forced line breaks, set through the guide's typograph (`typografText` in `src/guide/typograf.ts`: short words, a sentence's first word and a paragraph's last held to the next) with numbers kept whole and «ст.» held to its number (two typos fixed in the lists: «сидений», «Адаптивное управление»). «от …» in the band is the trim bare, fixed; «Полная стоимость» at the bottom is the car as it stands, the trim's price and the equipment the dealer adds, which the law asks to be shown whole: the dealer's to set, the trim's price by default, never under it («Стоимость ниже цены»). The monthly payment is fixed. Not «Розничная цена» (it read as a second, same price).

## The form

Model, trim, the QR's link, «Полная стоимость, ₽» (follows the trim until edited, `fullSet`), «Сноска» (a textarea, at most 240 px tall, then it scrolls). The fine print follows the trim until edited (`legalSet`); switching the model brings the model's own back (a model's may carry its credit terms). Faults (`firstIssue`): the QR's link, the full cost (empty, under the trim's price), then the card's own (`buildCard`'s `issues`: too long, a character the brand font lacks, an obscene word). The QR leads to the model's page by default (`DEFAULT_URL`), and switching models swaps it while it's still the old model's page.

The page holds several cards (`useStaff` with no table mode, opened with the link's cards through `initial`): one always selected, each fitting the canvas's height on wide screens; a card's «Сбросить» brings it back to its model's defaults; «Добавить», the plus in the card's column (⌘↩), adds a copy of the last card. «Скачать» gives one PDF, an A3 page per card, RGB as the photo, no bleed (one card is `<Brand>-8-MAX.pdf`, several `<Brand>_price-cards.pdf`). pdf-lib loads on the first download or share. On phones model and trim share a row while each is at least 180 px wide.

## Photos

Each trim has its own, two files: the full JPEG for the PDF and a 1600 px WebP for the preview (`*-car-preview.webp`, `cwebp -q 80 -resize 1600 0`), cut to what the band shows and 3 mm round it at the photo's own resolution (no more is kept), each with its box in Figma's px (`photo.box`) and its size (`px`); the brand's own photos and boxes are in its `README.md`. A new photo: cut it the same way (`magick … -crop WxH+X+Y -quality 88`), set its box and `px`, and make the WebP.

The template icon in the card's column, «Скачать прайс-карту», gives that card as it is (`<Brand>-5-PRO.pdf`). `<site>/price-card?t`, the guide's PDF in Материалы, gives `<Brand>_price-cards.pdf`, every trim as it comes, the first model first (`defaultsPdf`) (see «Editable templates» in `docs/generators.md`).

The guide's picture of the card (Материалы, `PriceCardPreview` in `src/guide/parts.tsx`) is the generator's own `CardArt`: the card the brand's guide names (`model`, `trim`) at its defaults, built once the guide has loaded the fonts.
