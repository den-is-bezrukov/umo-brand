import type { Font } from 'opentype.js'

// Live text for the generators' editable templates («Скачать шаблон»): the same lines their PDFs draw in outlines,
// as text in CoFo Sans a print shop can edit where the font is installed. A generator's line setter notes each line it
// sets (`noteLine`) while a build runs under `recordText`; the template then writes those lines where the outlines
// stand (`liveTextPdf.ts`, loaded with the PDF only). Glyphs a generator substitutes by hand (case forms, lining
// tabular figures) are written as their plain letters: the template is for editing, the print file keeps them.

/** A line as set: the font, its size and baseline, each character's pen, in the generator's units; `white` on a dark band */
export interface TextLine { font: Font; size: number; baseline: number; chars: { ch: string; x: number }[]; white?: boolean }

let sink: TextLine[] | null = null

/** Runs `build` noting the lines it sets */
export function recordText<T>(build: () => T): { result: T; lines: TextLine[] } {
  const prev = sink
  const lines: TextLine[] = []
  sink = lines
  try {
    return { result: build(), lines }
  } finally {
    sink = prev
  }
}

/**
 * Notes a line while `recordText` runs: `pens`, each glyph's pen, one a character (a ligature or a glyph missing one
 * leaves the line one run from its first pen)
 */
export function noteLine(font: Font, size: number, baseline: number, text: string, pens: number[], white = false) {
  if (sink && text) sink.push(textLine(font, size, baseline, text, pens, white))
}

/** A line as `noteLine` notes it, for a generator that keeps its lines itself (the livery) */
export function textLine(font: Font, size: number, baseline: number, text: string, pens: number[], white = false): TextLine {
  const chars = [...text]
  return {
    font, size, baseline, white,
    chars: chars.length === pens.length ? chars.map((ch, i) => ({ ch, x: pens[i] })) : [{ ch: text, x: pens[0] ?? 0 }],
  }
}
