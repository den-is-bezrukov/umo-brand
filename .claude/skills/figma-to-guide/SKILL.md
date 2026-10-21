---
name: figma-to-guide
description: Bring a block of a brand's guide from Figma into the site — layout and spacing into the guide (the brand's chapters and texts in brand/<name>/guide/index.tsx, blocks in src/guide/parts.tsx, the page in src/guide/Guide.tsx), illustrations into brand/<name>/guide/images as 2x WebP or cut SVG, downloads into brand/<name>/public/downloads. Use whenever the user shares a figma.com link to the brand's guide and asks to update, add or match a section, picture, icon or spacing of the guide or the generators («как в макете», «обнови раздел», «вот вектор»).
---

# Figma → guide

`docs/guide.md` has the facts (where things live, the grid, rhythm, downloads), `docs/brand.md` what the brand's folder holds; read them first. The brand is the folder `brand/<name>/` the site is built with (`BRAND`, see `vite.config.ts`); below it's `brand/<name>/`. This is the order of work that held up.

## 1. Read the node, not just the picture

- `get_screenshot` of the node to see it, `get_metadata` / `use_figma` to walk children for exact x/y/w/h, paddings, strokes and effects (load `/figma-use` before `use_figma`). Take numbers from the nodes; a screenshot hides clipping, half-transparent borders and which side a stroke is on.
- If the layout disagrees with what's already built, or a number looks off, say so before building. The user sometimes says the mock is wrong («это я ошибся в макете»). Where there's no mock, their numbers are a guess: confirm.

## 2. Illustrations

**Raster (photos, icon plates, posters' backgrounds) → `brand/<name>/guide/images/<name>.webp`, 2x, `cwebp -q 90`.** Frames that stretch inside a grid/flex parent export at the wrong size, so either:
- export the parent section Block and crop the frame out of it (`magick … -crop`), or
- in `use_figma`: clone the frame next to the page content, `clone.rescale(2)`, name it `TMP export 2x`, `get_screenshot` the clone at a large `maxDimension`, then **delete the clone** (check the name before removing).

Overwrite the file with the same name; `import.meta.glob` picks it up. Keep every image under 2.5 MB (CI fails otherwise).

**Vector schemes → `<name>.svg`** (`img()` prefers it over WebP): export the parent Body node as SVG with outlined text, add a `make()` line for the figure (the export, the frame to keep, its crop box) at the bottom of `scripts/split-figma-svg.py`, and run `python3 scripts/split-figma-svg.py <exports> brand/<name>/guide/images`. Frames that export stretched are laid out from layer exports with `assemble()`. The lines are for this run only: once the SVG is in the brand's folder, take them out again.

**Icons for the UI (`src/icons/`)**: `exportAsync({ format: 'SVG_STRING', svgOutlineText: true })` on the node, keep the path data, use `currentColor`. Keep hairlines as filled rects, not zero-width stroked paths.

**Logo on a flat colour** is not a picture: use `LogoPlate`.

## 3. Text and layout

- Body copy width comes from its length (`Text`), section/chapter gaps from `gap-section` / `Chapter`. Don't hard-code widths or breakpoint gaps.
- Optical alignment uses the brand font's metrics (the space above its caps at leading 1), not eyeballing.
- Run Russian copy through the `ru-typograph` rules; the page already has `useTypograf`.
- Renaming or moving a chapter or section: keep the anchor or add the old id to `OLD_ANCHORS` (`brand/<name>/guide/index.tsx`). Links to the guide have gone out.

## 4. Check before showing

Open `dev` from `.claude/launch.json` (it attaches to the running server, see AGENTS.md). Compare with the Figma screenshot at 1440 and on a phone (350), and at the `md`/`lg` edges (768, 1024, 1280) where the sidebar and paddings switch. Measure with `javascript_tool` (getBoundingClientRect) against the Figma numbers rather than judging screenshots. Then update `docs/guide.md` for anything a future session would need, and hand over to `ship` when the user says «пушим».
