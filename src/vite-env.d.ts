/// <reference types="vite/client" />

/**
 * The brand type's measures in em, read from its font file by vite.config.ts (`fontMetrics`): `cap` the capitals'
 * height; `ascent` and `descent` the line box Figma puts a line in (the font's hhea), whose middle it centres in a
 * line's height, so a baseline is (line − (ascent + descent) · size) / 2 + ascent · size under the line's top;
 * `descender` the deepest descender of the Cyrillic (р, у, д)
 */
declare module 'virtual:font-metrics' {
  export const METRICS: { cap: number; ascent: number; descent: number; descender: number }
}
