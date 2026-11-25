import { PDFName, PDFHexString, type PDFDocument, type PDFDict } from 'pdf-lib'

/**
 * What a generator's PDF was made from, as JSON in its document info under `key`, read back by `readPdfData` when the
 * file is dropped on the page; nothing of it is printed. Save the document with `useObjectStreams: false`
 */
export function writePdfData(doc: PDFDocument, key: string, data: unknown) {
  ;(doc as unknown as { getInfoDict(): PDFDict }).getInfoDict().set(PDFName.of(key), PDFHexString.fromText(JSON.stringify(data)))
}
