import {
  PDFDocument, PDFOperator, PDFOperatorNames, PDFNumber,
  moveTo, lineTo, appendBezierCurve, closePath, pushGraphicsState, popGraphicsState, setFillingCmykColor, setStrokingCmykColor, stroke,
} from 'pdf-lib'
import { zipSync, strToU8 } from 'fflate'
import { TAG, LOGO, TAGS_KEY, type Tag } from './tag'
import { writePdfData } from '@/ui/pdfDataWrite'
import type { Cmd } from '@/livery/geometry'

// Loaded only when the files are downloaded, so the page doesn't carry pdf-lib until then.

/** How the tag should look, for the maker: the guide's photo of the tag on a shirt */
const REFERENCE = new URL('../assets/guide/name-tag.webp', import.meta.url).href

const PT = 72 / 25.4
/** The source's colour, C60 M40 Y40 K100: nominal, the material decides the real one */
const INK: [number, number, number, number] = [0.6, 0.4, 0.4, 1]

/** The LOGO path's M/L/C/Z commands as Cmds */
function svgCmds(d: string): Cmd[] {
  const cmds: Cmd[] = []
  for (const [, op, args] of d.matchAll(/([MLCZ])([^MLCZ]*)/g)) {
    const n = args.trim() ? args.trim().split(/[\s,]+/).map(Number) : []
    if (op === 'Z') cmds.push(['Z'])
    else if (op === 'C') cmds.push(['C', n[0], n[1], n[2], n[3], n[4], n[5]])
    else cmds.push([op as 'M' | 'L', n[0], n[1]])
  }
  return cmds
}

/** The plate's outline, 4 mm corners drawn as the source draws them */
function outline(): Cmd[] {
  const { w, h, r } = TAG
  const k = r * 0.5523
  return [
    ['M', r, 0], ['L', w - r, 0], ['C', w - r + k, 0, w, r - k, w, r],
    ['L', w, h - r], ['C', w, h - r + k, w - r + k, h, w - r, h],
    ['L', r, h], ['C', r - k, h, 0, h - r + k, 0, h - r],
    ['L', 0, r], ['C', 0, r - k, r - k, 0, r, 0], ['Z'],
  ]
}

function pathOps(cmds: Cmd[], H: number): PDFOperator[] {
  const X = (x: number) => x * PT
  const Y = (y: number) => H - y * PT
  return cmds.map(c =>
    c[0] === 'M' ? moveTo(X(c[1]), Y(c[2]))
      : c[0] === 'L' ? lineTo(X(c[1]), Y(c[2]))
        : c[0] === 'C' ? appendBezierCurve(X(c[1]), Y(c[2]), X(c[3]), Y(c[4]), X(c[5]), Y(c[6]))
          : closePath())
}

/**
 * One page per tag at 1:1, as the source: the plate's outline as a 0.5 pt stroke (the cut line), the logo and the text
 * as filled outlines, all in the source's colour
 */
async function tagsPdf(tags: Tag[], people: unknown): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle('UMO name tags 70×25')
  // The staff as typed, so the PDF (or the ZIP holding it) dropped back on the page opens them
  writePdfData(doc, TAGS_KEY, { people })
  const logo = svgCmds(LOGO)
  for (const tag of tags) {
    const page = doc.addPage([TAG.w * PT, TAG.h * PT])
    const H = page.getHeight()
    page.pushOperators(
      pushGraphicsState(), setStrokingCmykColor(...INK), PDFOperator.of(PDFOperatorNames.SetLineWidth, [PDFNumber.of(0.5)]),
      ...pathOps(outline(), H), stroke(), popGraphicsState(),
      pushGraphicsState(), setFillingCmykColor(...INK),
      ...pathOps(logo, H), PDFOperator.of(PDFOperatorNames.FillNonZero),
      ...pathOps(tag.cmds, H), PDFOperator.of(PDFOperatorNames.FillNonZero),
      popGraphicsState(),
    )
  }
  return doc.save({ useObjectStreams: false })
}

/** The requirements of the source's `UMO_name-tag_spec_ТТ.txt`, the text now coming in outlines */
function spec(count: number): string {
  return `БЕЙДЖ СОТРУДНИКА ДЦ UMO
Требования к изготовлению


СОСТАВ

UMO_name-tags.pdf            — макеты бейджей, ${count} шт., по одному на странице, 1:1
UMO_name-tag_reference.webp  — референс внешнего вида
Размер 70 × 25 мм, углы скруглены радиусом 4 мм.
Контур — линия реза. Текст и логотип уже в кривых.


ВНЕШНИЙ ВИД

Как на референсе: матовая шлифованная серебристая поверхность, тёмный
текст и логотип.
Размер, форма и вёрстка — строго по макету.
Цвета в файле условные: итоговый цвет текста определяется материалом.


МАТЕРИАЛ И НАНЕСЕНИЕ (допустимые варианты)

1. Двухслойный пластик для лазерной гравировки: лицевой слой «серебро
   шлифованное», сердцевина чёрная, толщина 0,8–1,6 мм (Rowmark LaserMax
   или аналог). Гравировка CO2-лазером на всю глубину лицевого слоя.
   Основной вариант.

2. Нержавеющая сталь с шлифовкой, толщина 0,5–1 мм. Маркировка
   волоконным лазером методом отжига, текст тёмный и контрастный.
   Премиальный вариант.


НЕ ДОПУСКАЕТСЯ

- Лазерная маркировка по серебристому анодированному алюминию
  (текст выходит светлым и нечитаемым).
- Сублимация, УФ-печать, аппликация плёнкой.
- Глянцевая или зеркальная поверхность.
- Изменение вёрстки, масштабирование текста или логотипа.


ОБРАБОТКА И КРЕПЛЕНИЕ

- Направление шлифовки — горизонтальное.
- Торец обработан, со скосом (фаской), без заусенцев и следов реза.
- Крепление — магнитное (два неодимовых магнита). Допустима булавка.
`
}

export async function tagsZip(tags: Tag[], people: unknown): Promise<Blob> {
  const [pdf, photo] = await Promise.all([tagsPdf(tags, people), fetch(REFERENCE).then(r => r.arrayBuffer())])
  const zip = zipSync({
    'UMO_name-tags.pdf': pdf,
    'UMO_name-tag_reference.webp': new Uint8Array(photo),
    '00_UMO_name-tags_spec.txt': strToU8(spec(tags.length)),
  }, { level: 0 })
  return new Blob([zip as BlobPart], { type: 'application/zip' })
}
