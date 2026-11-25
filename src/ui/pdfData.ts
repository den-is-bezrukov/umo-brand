import { unzipSync, strFromU8 } from 'fflate'

// A generator's own files dropped back on its page open what they were made from, to change a line and download
// again: the PDF carries the list as typed, JSON in its document info under the generator's key (`writePdfData`,
// loaded with pdf-lib only for the download). The PDF is saved without object streams, so the entry stays plain in the
// file and is read here with no PDF parser.

export const isPdf = (bytes: Uint8Array) => strFromU8(bytes.subarray(0, 5), true) === '%PDF-'

/** The PDF inside a zip a generator gave (the name tags' ZIP); null for any other zip or file */
export function pdfInZip(bytes: Uint8Array): Uint8Array | null {
  try {
    const files = unzipSync(bytes, { filter: f => f.name.toLowerCase().endsWith('.pdf') })
    return Object.values(files)[0] ?? null
  } catch {
    return null
  }
}

/** The JSON a generator put in its PDF under `key`; undefined if the PDF has none (any other PDF, or one made before) */
export function readPdfData(bytes: Uint8Array, key: string): unknown {
  // Latin-1, one character a byte, to find the entry as written
  const m = strFromU8(bytes, true).match(new RegExp(`/${key}\\s*<([0-9A-Fa-f\\s]*)>`))
  if (!m) return undefined
  const hex = m[1].replace(/\s/g, '')
  const raw = new Uint8Array(hex.length / 2).map((_, i) => parseInt(hex.slice(2 * i, 2 * i + 2), 16))
  // pdf-lib writes text as UTF-16BE after a byte-order mark
  const json = raw[0] === 0xfe && raw[1] === 0xff ? new TextDecoder('utf-16be').decode(raw.subarray(2)) : new TextDecoder().decode(raw)
  try {
    return JSON.parse(json)
  } catch {
    return undefined
  }
}
