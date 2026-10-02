---
name: figma-to-guide
description: Bring a Figma block of the UMO brand guide (file i6PdEDo72Vab0cAixG0nIz) into the site — layout and spacing into Guide.tsx, illustrations into src/assets/guide as 2x WebP or cut SVG, downloads into public/downloads. Use whenever the user shares a figma.com link to this file and asks to update, add or match a section, picture, icon or spacing of the guide or the generators («как в макете», «обнови раздел», «вот вектор»).
---

# Figma → guide

AGENTS.md has the facts (where things live, the grid, rhythm, downloads). This is the order of work that held up.

## 1. Read the node, not just the picture

- `get_screenshot` of the node to see it, `get_metadata` / `use_figma` to walk children for exact x/y/w/h, paddings, strokes and effects (load `/figma-use` before `use_figma`). Take numbers from the nodes; a screenshot hides clipping, half-transparent borders and which side a stroke is on.
- Note the node id: commit messages and AGENTS.md cite it (`Figma 4865:1025`).
- If the layout disagrees with what's already built, or a number looks off, say so before building. The user sometimes says the mock is wrong («это я ошибся в макете»). Where there's no mock, their numbers are a guess: confirm.

## 2. Illustrations

**Raster (photos, icon plates, posters' backgrounds) → `src/assets/guide/<name>.webp`, 2x, `cwebp -q 90`.** Frames that stretch inside a grid/flex parent export at the wrong size, so either:
- export the parent section Block and crop the frame out of it (`magick … -crop`), or
- in `use_figma`: clone the frame next to the page content, `clone.rescale(2)`, name it `TMP export 2x`, `get_screenshot` the clone at a large `maxDimension`, then **delete the clone** (check the name before removing).

Overwrite the file with the same name; `import.meta.glob` picks it up. Keep every image under 2.5 MB (CI fails otherwise).

**Vector schemes → `<name>.svg`** (`img()` prefers it over WebP): export the parent Body node as SVG with outlined text and add the node id and crop box at the bottom of `scripts/split-figma-svg.py`; run `python3 scripts/split-figma-svg.py <exports> src/assets/guide`. Frames that export stretched are assembled from layer exports in `assemble()`.

**Icons for the UI (`src/icons/`)**: `exportAsync({ format: 'SVG_STRING', svgOutlineText: true })` on the node, keep the path data, use `currentColor`. Keep hairlines as filled rects, not zero-width stroked paths.

**Logo on a flat colour** is not a picture: use `LogoPlate`.

## 3. Text and layout

- Body copy width comes from its length (`Text`), section/chapter gaps from `gap-section` / `Chapter`. Don't hard-code widths or breakpoint gaps.
- Optical alignment uses CoFo Sans metrics (`0.164em` cap offset), not eyeballing.
- Run Russian copy through the `ru-typograph` rules; the page already has `useTypograf`.
- Renaming or moving a chapter or section: keep the anchor or add the old id to `OLD_ANCHORS`. Links to the guide have gone out.

## 4. Check before showing

Start `dev` from `.claude/launch.json` (port 8443). Compare with the Figma screenshot at 1440 and on a phone (375), and at the `md`/`lg` edges (768, 1024, 1280) where the sidebar and paddings switch. Measure with `javascript_tool` (getBoundingClientRect) against the Figma numbers rather than judging screenshots. Then update AGENTS.md for anything a future session would need, and hand over to `ship` when the user says «пушим».
