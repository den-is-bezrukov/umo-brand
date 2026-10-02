# Golos UMO

A prototype of a UMO brand typeface: Golos Text (Alexandra Korolkova and Vitaly Kuzmin, ParaType, SIL Open Font License 1.1, [googlefonts/golos-text](https://github.com/googlefonts/golos-text)) with its capitals and figures widened toward the proportions of CoFo Sans and its weights set to CoFo's. Lowercase shapes and spacing are Golos's own. Not used by the site yet.

## What changed from Golos Text

- **Capitals and figures are wider**, by the amounts in `scripts/delta.json` (font units on the 700 cap height), measured against CoFo Sans Medium. Letters made of straight strokes only (H E T Ш П Ц…) are cut where a vertical line crosses nothing but horizontal lines, and moved apart. Everything with curves or diagonals is scaled across with the weight compensated in x only: x comes from a lighter instance of the same glyph, y from the original, so vertical strokes and diagonals keep their thickness, horizontals stay as they were and the curves stay exactly as smooth (no flats are added: O keeps Golos's superness, 0.820 against Golos's 0.821 and CoFo's 0.815). Z, whose diagonal flattens most, gets less compensation so it doesn't thin. К, У, I, J and Б are left as they are.
- **Relatives follow:** letters drawn on a widened base (Ң Ө Є Ә Ғ Ҷ Æ Œ Ø Ð Þ, ₽ € $ ¥ ₸…) get its amount, old-style figures a proportional one, tabular figures (lining and old-style) the new shapes on one shared width, and composites (Ё Й Ў Ӧ É…) their base's width at any depth of nesting, with marks and anchors moved to the new centre.
- **Capitals' sidebearings are 7% tighter**, in proportion, so rounds lose less than straights, as in CoFo.
- **Two working styles only:** Regular (400) is extrapolated below Golos's lightest master, to CoFo Regular's stem (0.118 of the cap height); Medium (500) is Golos at 540, between its Medium and SemiBold, matching CoFo Medium (0.169). Other weights come later.
- **The OpenType features stay** (tnum, case, frac, onum, mark…), and so does the kerning.

## Checks

`build.sh` stops if a widened glyph gains a curvature break between two curves that Golos doesn't have, gains or loses points, or if the superness of O or 0 moves more than 0.01 from Golos's, in either style (`scripts/checks/check.py`; CoFo Regular's and Medium's are printed for reference).

## Files

- `GolosUMO[wght].ttf` / `.woff2`: the variable font, 400–500 (Regular to Medium)
- `GolosUMO-Regular` / `-Medium` (`.ttf`, `.woff2`): static instances
- `OFL.txt`: the license, which also covers this modified version
- `build.sh`: rebuilds everything from the pinned Golos sources (`pip install fontmake glyphsLib ufoLib2 fontMath brotli`)

## Not done yet

The x-height (lowercase) is unchanged on purpose. Nothing has been drawn by hand yet: no spur on G, and the kerning of the reshaped pairs (L, Г, Т, Р with their neighbours) is Golos's. A type designer still needs to check optical details, overshoots and hinting before this ships.
