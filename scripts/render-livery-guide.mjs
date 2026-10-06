// Renders the guide's Ливрея picture, src/assets/guide/livery-umo8.webp: the UMO 8 left side with the generator's
// default texts and the default QR link, built by the generator's own code (loaded through Vite), on the side photo.
// The frame is the one the picture has always had: 1824×912 on #f6f6f6, the photo (0.5 px/mm) scaled 0.674 and
// moved by (100, 120), so the car takes 84% of the width. Needs ImageMagick and cwebp. Run it when the livery's
// layout or defaults change:
//   node scripts/render-livery-guide.mjs
import { createServer } from 'vite'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import opentype from 'opentype.js'

const K = 0.674
const OFFSET = [100, 120]

// opentype.js is CommonJS, which Node's ESM can't take named imports from: Vite transforms it instead
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', ssr: { noExternal: ['opentype.js'] } })
const geo = await server.ssrLoadModule('/src/livery/geometry.ts')
const lay = await server.ssrLoadModule('/src/livery/layout.ts')
const page = readFileSync('src/Livery.tsx', 'utf8')
await server.close()

// The defaults as the generator has them
const constant = name => JSON.parse(page.match(new RegExp(`const ${name} = ('[^']*')`))[1].replace(/^'|'$/g, '"'))
const dealer = constant('DEFAULT_TOP')
const url = constant('DEFAULT_URL')
const tagline = page.match(/umo8: '([^']*)'/)[1]

const buf = readFileSync('public/fonts/CoFoSans-Medium.ttf')
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length))
const surface = lay.UMO8.left
const sheet = geo.buildSheet(font, surface, { dealer, tagline, url })
if (sheet.issues.length) throw new Error(sheet.issues.join('; '))
const lines = [...sheet.dealer.lines, ...sheet.tagline.lines]
const paths = [...sheet.fixed, ...lines.map(l => l.cmds)]
  .map(c => `<path d="${geo.toD(c)}" fill="#fff" fill-rule="evenodd"/>`).join('')
const s = 0.5 * K
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1824" height="912" viewBox="0 0 1824 912">`
  + `<g transform="translate(${surface.photo.x * s + OFFSET[0]} ${surface.photo.y * s + OFFSET[1]}) scale(${s})">${paths}</g></svg>`

const dir = mkdtempSync(join(tmpdir(), 'livery-guide-'))
writeFileSync(join(dir, 'decals.svg'), svg)
const photo = 'src/assets/livery/umo8-side.webp'
const [pw, ph] = [Math.round(2400 * K), Math.round(1000 * K)]
execFileSync('magick', [
  '-size', '1824x912', 'xc:#f6f6f6',
  '(', photo, '-resize', `${pw}x${ph}!`, ')', '-geometry', `+${OFFSET[0]}+${OFFSET[1]}`, '-composite',
  '(', '-background', 'none', '-density', '384', join(dir, 'decals.svg'), '-resize', '1824x912!', ')', '-composite',
  join(dir, 'out.png'),
])
execFileSync('cwebp', ['-quiet', '-q', '90', join(dir, 'out.png'), '-o', 'src/assets/guide/livery-umo8.webp'])
console.log(`livery-umo8.webp: «${dealer.replace('\n', ' / ')}», «${tagline}», QR ${url}`)
