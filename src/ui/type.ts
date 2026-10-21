import { parse, type Font, type Glyph } from 'opentype.js'
import type { Cmd } from '@/livery/geometry'
import type { BrandFont } from '@/brand'
import { FONTS } from '@brand/fonts'

// Text in outlines, as the generators share it: the brand's type (`@brand/fonts`) loaded once, texts tidied, lines set glyph by glyph with
// kerning, tracking and the features opentype.js doesn't apply itself, lines wrapped between words. Sizes and
// positions are in the generator's units (mm), y down.

export interface Fonts { medium: Font; regular: Font }

const fontPromises = new Map<string, Promise<Font>>()
const load = (face: BrandFont) => {
  let p = fontPromises.get(face.file)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}${face.file}`).then(r => r.arrayBuffer()).then(buf => parse(buf))
    fontPromises.set(face.file, p)
  }
  return p
}

/** The brand's Medium, the face most generators set everything in */
export const loadFont = () => load(FONTS.medium)
export const loadFonts = (): Promise<Fonts> => Promise.all([load(FONTS.medium), load(FONTS.regular)]).then(([medium, regular]) => ({ medium, regular }))

/** Paragraphs as typed: every kind of space becomes a plain one, zero-width marks go, empty lines too */
export const tidy = (t: string) => t.replace(/[​-‍⁠﻿]/g, '').replace(/\r/g, '').split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
/** One line: every kind of space and line break becomes a plain space, zero-width marks go */
export const oneLine = (t: string) => t.replace(/[​-‍⁠﻿]/g, '').replace(/\s+/g, ' ').trim()

/** An address's abbreviations that stand before a name or number («ул. Ленина», «стр. 2», «пр-т Мира») */
const ADDRESS_ABBR = /(^|[\s ])((?:ул|просп|пр|пер|пл|наб|бул|ш|мкр|д|корп|стр|вл|кв|оф|пом|эт|г|пос|п|с|дер|обл|км)\.|пр-т|б-р|р-н) +(?=\S)/gi

/**
 * Words of one or two characters (prepositions, conjunctions, a separator bar) and an address's abbreviations stick to
 * the next word with a no-break space
 */
export function bindShortWords(text: string): string {
  let prev
  do {
    prev = text
    text = text.replace(/(^|[\s ])([^\s ]{1,2}) +(?=\S)/g, '$1$2 ').replace(ADDRESS_ABBR, '$1$2 ')
  } while (text !== prev)
  return text
}

/** The characters of `text` the font has no glyph for, each once */
export const missingChars = (font: Font, text: string) => [...new Set([...text.replace(/\s/g, '')].filter(c => !font.hasChar(c)))]

/**
 * A feature's single substitutions (`case`: the bar, brackets and dashes raised to the capitals; `lnum`, `tnum`), glyph
 * by glyph, as opentype.js doesn't apply them itself
 */
const features = new WeakMap<Font, Map<string, Map<number, number>>>()
export function featureMap(font: Font, tag: string): Map<number, number> {
  let byTag = features.get(font)
  if (!byTag) features.set(font, byTag = new Map())
  let map = byTag.get(tag)
  if (!map) {
    map = new Map()
    // getSingle is in opentype.js, not in its typings
    const single = (font.substitution as unknown as { getSingle(f: string, s: string, l: string): { sub: number; by: number }[] }).getSingle
    for (const script of ['DFLT', 'cyrl', 'latn']) {
      for (const { sub, by } of single.call(font.substitution, tag, script, 'dflt')) map.set(sub, by)
    }
    byTag.set(tag, map)
  }
  return map
}

export interface SetRuns {
  /** Each run's outlines */
  parts: Cmd[][]
  /** Each glyph's pen, for the editable template's live text */
  pens: number[]
  /** The advance from `x` to after the last glyph, no tracking after it */
  width: number
  /** Where the pen stops after the last glyph */
  end: number
  /** The ink's left and right edges (±Infinity with no ink) */
  ink: { x1: number; x2: number }
  /** From `x` to the ink's right edge, 0 with no ink */
  right: number
}

/**
 * Runs of text set one after another from `x` on `baseline`: the features asked for, kerning (across runs too) and
 * `track` mm between letters
 */
export function setRuns(font: Font, runs: string[], x: number, baseline: number, size: number, feats: string[] = [], track = 0): SetRuns {
  const scale = size / font.unitsPerEm
  const maps = feats.map(f => featureMap(font, f))
  const glyphs: { g: Glyph; run: number }[] = runs.flatMap((text, run) =>
    font.stringToGlyphs(text).map(g => ({ g: font.glyphs.get(maps.reduce((i, m) => m.get(i) ?? i, g.index)), run })))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const commands: any[][] = runs.map(() => [])
  const ink = { x1: Infinity, x2: -Infinity }
  const pens: number[] = []
  let pen = x
  glyphs.forEach(({ g, run }, i) => {
    pens.push(pen)
    const p = g.getPath(pen, baseline, size)
    commands[run].push(...p.commands)
    if (p.commands.length) {
      const b = p.getBoundingBox()
      ink.x1 = Math.min(ink.x1, b.x1)
      ink.x2 = Math.max(ink.x2, b.x2)
    }
    pen += g.advanceWidth! * scale
    if (i < glyphs.length - 1) pen += font.getKerningValue(g, glyphs[i + 1].g) * scale + track
  })
  return { parts: commands.map(pathCmds), pens, width: pen - x, end: pen, ink, right: Math.max(ink.x2, x) - x }
}

/** One line from `x` on `baseline`, as `setRuns` sets it */
export function setLine(font: Font, text: string, x: number, baseline: number, size: number, feats: string[] = [], track = 0) {
  const { parts, ...rest } = setRuns(font, [text], x, baseline, size, feats, track)
  return { cmds: parts[0], ...rest }
}

/**
 * Words in lines, each line taking as many as `fits`; a word that doesn't fit an empty line is cut by `split` (kept
 * whole by default, to be said too wide)
 */
export function wrapWords(words: string[], fits: (line: string) => boolean, split: (word: string) => string[] = w => [w]): string[] {
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w
    if (fits(candidate)) { line = candidate; continue }
    if (line) lines.push(line)
    const pieces = split(w)
    lines.push(...pieces.slice(0, -1))
    line = pieces[pieces.length - 1]
  }
  if (line) lines.push(line)
  return lines
}

/** Paragraphs in lines between words, short words held to the next (the lines keep their no-break spaces) */
export const wrap = (paragraphs: string[], fits: (line: string) => boolean, split?: (word: string) => string[]) =>
  paragraphs.flatMap(p => wrapWords(bindShortWords(p.trim()).split(/ +/).filter(Boolean), fits, split))

/** opentype.js path commands as `Cmd`s, quadratic curves made cubic */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pathCmds(commands: any[]): Cmd[] {
  const cmds: Cmd[] = []
  let cx = 0
  let cy = 0
  for (const c of commands) {
    if (c.type === 'M' || c.type === 'L') { cmds.push([c.type, c.x, c.y]); cx = c.x; cy = c.y }
    else if (c.type === 'C') { cmds.push(['C', c.x1, c.y1, c.x2, c.y2, c.x, c.y]); cx = c.x; cy = c.y }
    else if (c.type === 'Q') {
      cmds.push(['C', cx + (2 / 3) * (c.x1 - cx), cy + (2 / 3) * (c.y1 - cy), c.x + (2 / 3) * (c.x1 - c.x), c.y + (2 / 3) * (c.y1 - c.y), c.x, c.y])
      cx = c.x; cy = c.y
    } else if (c.type === 'Z') cmds.push(['Z'])
  }
  return cmds
}
