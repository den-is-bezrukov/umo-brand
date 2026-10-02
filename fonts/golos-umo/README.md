# Golos UMO

A prototype of a UMO brand typeface: Golos Text (Alexandra Korolkova and Vitaly Kuzmin, ParaType, SIL Open Font License 1.1, [googlefonts/golos-text](https://github.com/googlefonts/golos-text)) with its capitals and figures widened toward the proportions of CoFo Sans and its weights set to CoFo's. Lowercase shapes and spacing are Golos's own. Not used by the site yet.

## What changed from Golos Text

- **Capitals and figures are wider**, by the amounts in `scripts/delta.json` (font units on the 700 cap height). Where a vertical line crosses only horizontal strokes or the top and bottom of a round, the letter is cut there and its right part moved over, the extremum point becoming a short flat, so stems keep their thickness and curves their shape (O C G E H Ш Ю 0 3…). Diagonal letters and S-shapes (A M N V W X Y Z И Ф Ч 1 2 4 5 6 7 8 9…) have no such line, so they are scaled across, from a slightly lighter version of the same weight to keep the stems even. К, У, I, J, Б and ₽ were left as they are. Composites (Й, Ё, accented Latin) follow their base letters; tabular figures take the new shapes on one shared width.
- **Capitals are 5 units tighter on each side**, so caps-only lines space like CoFo's.
- **Weights:** Regular (400) is extrapolated below Golos's lightest master, to CoFo Regular's stem (0.118 of the cap height); Medium (500) is Golos at 540, matching CoFo Medium (0.169). SemiBold to Black are Golos's.
- **The OpenType features stay** (tnum, case, frac, onum, mark…), and so does the kerning.

## Files

- `GolosUMO[wght].ttf` / `.woff2`: the variable font, 400–900
- `GolosUMO-Regular` / `-Medium` (`.ttf`, `.woff2`): static instances
- `OFL.txt`: the license, which also covers this modified version
- `build.sh`: rebuilds everything from the pinned Golos sources (`pip install fontmake glyphsLib ufoLib2 fontMath brotli`)

## Not done yet

The x-height (lowercase) is unchanged on purpose. Nothing has been drawn by hand: a type designer still needs to check the optical details of the cut and scaled letters, the overshoots, kerning of the widened capitals and hinting before this ships.
