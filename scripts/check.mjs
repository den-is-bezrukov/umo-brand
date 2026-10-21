#!/usr/bin/env node
// The site checked against a baseline, so moving code around can be shown to change nothing: a headless browser goes
// through the guide and every generator on set data (defaults, the blank template `?t`, a long dealer's name, a list
// from a table, edge cases), saves the files they download, the page text and screenshots on a phone (350×622) and a
// wide screen. PDFs are compared as pictures of their pages (their bytes carry the date they were made).
//
//   node scripts/check.mjs --baseline   the baseline, from the site as it is now (.check.nosync/baseline)
//   node scripts/check.mjs              the site now against it: .check.nosync/report.txt, pictures of the differences in .check.nosync/diff
//   BRAND=demo node scripts/check.mjs   … the site built with another brand (a run of its own, no baseline to match)
//   --only=livery,guide                 just the scenarios whose name starts with these
//   --compare-only                      the last run compared again, nothing captured
//   --baseline --baseline-from=87b0d0a  the baseline from that commit's code (a worktree of it in .check.nosync), for scenarios
//                                       added after the code moved on
//
// It builds the site into .check.nosync/build and serves it itself (no dev server needed). Needs Chrome (Playwright's
// headless shell when it's there, as it doesn't update itself between runs), pdftoppm and ImageMagick (Homebrew).

import { spawn, execFileSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import zlib from 'node:zlib'
import { zipSync, unzipSync, strToU8 } from 'fflate'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, '.check.nosync')
const args = process.argv.slice(2)
const BASELINE = args.includes('--baseline')
const ONLY = args.find(a => a.startsWith('--only='))?.slice(7).split(',')
/** The brand: `BRAND`, or the default one, package.json's `brand` */
const DEFAULT_BRAND = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).brand
const BRAND = process.env.BRAND || DEFAULT_BRAND
const RUN = path.join(OUT, BASELINE ? 'baseline' : BRAND === DEFAULT_BRAND ? 'current' : `current-${BRAND}`)
const BUILD = path.join(OUT, 'build')
const FROM = args.find(a => a.startsWith('--baseline-from='))?.slice(16)

// ---------------------------------------------------------------------------------------------------------------------
// What's checked

/** Rows into a one-sheet .xlsx with inline strings, as the generators' table readers take it */
function xlsx(rows) {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const col = i => String.fromCharCode(65 + i)
  const sheet = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows
    .map((r, y) => `<row r="${y + 1}">${r.map((c, x) => `<c r="${col(x)}${y + 1}" t="inlineStr"><is><t xml:space="preserve">${esc(c)}</t></is></c>`).join('')}</row>`)
    .join('')}</sheetData></worksheet>`
  return zipSync({
    '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'),
    '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    'xl/workbook.xml': strToU8('<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="1" sheetId="1" r:id="rId1"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': strToU8('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'),
    'xl/worksheets/sheet1.xml': strToU8(sheet),
  })
}

// The brand's scenarios and the tables they load (`brand/<BRAND>/check.mjs`): its dealers, models and files
const { SCENARIOS, TABLES } = await import(pathToFileURL(path.join(ROOT, 'brand', BRAND, 'check.mjs')).href)

const WIDE = { width: 1440, height: 900, mobile: false }
const PHONE = { width: 350, height: 622, mobile: true }

// ---------------------------------------------------------------------------------------------------------------------
// Tools

const log = (...a) => console.log(...a)
const sleep = ms => new Promise(r => setTimeout(r, ms))
const rm = p => fs.rmSync(p, { recursive: true, force: true })
const mkdir = p => fs.mkdirSync(p, { recursive: true })

function chromePath() {
  const shells = path.join(os.homedir(), 'Library/Caches/ms-playwright')
  if (fs.existsSync(shells)) {
    const dir = fs.readdirSync(shells).filter(d => d.startsWith('chromium_headless_shell-')).sort().pop()
    if (dir) {
      const found = fs.readdirSync(path.join(shells, dir)).map(d => path.join(shells, dir, d, 'chrome-headless-shell')).find(fs.existsSync)
      if (found) return found
    }
  }
  return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
}

function build() {
  log(`Сборка (${FROM ?? BRAND})…`)
  rm(BUILD)
  let cwd = ROOT
  if (FROM) {
    // The code of that commit in a worktree of its own, the dependencies shared
    cwd = path.join(OUT, `src-${FROM}`)
    if (!fs.existsSync(cwd)) {
      execFileSync('git', ['worktree', 'add', '--detach', cwd, FROM], { cwd: ROOT, stdio: 'inherit' })
      fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(cwd, 'node_modules'))
    }
  }
  execFileSync('pnpm', ['exec', 'vite', 'build', '--outDir', BUILD, '--emptyOutDir', '--logLevel', 'warn'], { cwd, stdio: 'inherit', env: { ...process.env, BRAND } })
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf', '.zip': 'application/zip', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.txt': 'text/plain' }

/** The build served as GitHub Pages does: a file, else the route's .html, else index.html */
function serve() {
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    let file = path.join(BUILD, p)
    if (!file.startsWith(BUILD)) return res.writeHead(403).end()
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = fs.existsSync(`${file}.html`) ? `${file}.html` : path.join(BUILD, 'index.html')
    const data = fs.readFileSync(file)
    const range = req.headers.range && /bytes=(\d+)-(\d*)/.exec(req.headers.range)
    const type = TYPES[path.extname(file)] ?? 'application/octet-stream'
    if (range) {
      const start = Number(range[1])
      const end = range[2] ? Number(range[2]) : data.length - 1
      res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${data.length}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 })
      return res.end(data.subarray(start, end + 1))
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': data.length, 'Accept-Ranges': 'bytes' })
    res.end(data)
  })
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)))
}

/** Chrome over the DevTools protocol, no library */
async function launch() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'brand-check-'))
  const proc = spawn(chromePath(), ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', '--mute-audio', '--font-render-hinting=none', '--disable-gpu', '--force-color-profile=srgb', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] })
  const wsUrl = await new Promise((resolve, reject) => {
    let err = ''
    proc.stderr.on('data', d => { err += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(err); if (m) resolve(m[1]) })
    proc.on('exit', () => reject(new Error(`Chrome не запустился:\n${err}`)))
  })
  const ws = new WebSocket(wsUrl)
  await new Promise(r => ws.addEventListener('open', r))
  let id = 0
  const pending = new Map()
  const listeners = new Set()
  ws.addEventListener('message', e => {
    const msg = JSON.parse(e.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(`${msg.error.message} ${msg.error.data ?? ''}`)) : resolve(msg.result)
    } else for (const l of listeners) l(msg)
  })
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const n = ++id
    pending.set(n, { resolve, reject })
    ws.send(JSON.stringify({ id: n, method, params, sessionId }))
  })
  const close = async () => { try { ws.close() } catch {} proc.kill(); await new Promise(r => proc.exitCode !== null ? r() : proc.on('exit', r)); try { rm(profile) } catch {} }
  return { send, on: l => { listeners.add(l); return () => listeners.delete(l) }, close }
}

/** A page: its session, navigation, network idle, downloads */
async function openPage(cdp, downloads) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
  const s = (m, p) => cdp.send(m, p, sessionId)
  let inflight = new Set()
  let lastNet = Date.now()
  const events = []
  cdp.on(msg => {
    if (msg.method?.startsWith('Browser.download')) events.push(msg)
    if (msg.sessionId !== sessionId) return
    const { method, params } = msg
    if (method === 'Network.requestWillBeSent') { inflight.add(params.requestId); lastNet = Date.now() }
    if (method === 'Network.loadingFinished' || method === 'Network.loadingFailed') { inflight.delete(params.requestId); lastNet = Date.now() }
    if (method === 'Runtime.exceptionThrown') events.push({ error: params.exceptionDetails?.exception?.description ?? params.exceptionDetails?.text })
  })
  await s('Page.enable')
  await s('Network.enable')
  await s('Runtime.enable')
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allowAndName', downloadPath: downloads, eventsEnabled: true })
  // Still pictures: no animations, transitions, caret or smooth scrolling; reduced motion turns the guide's scroll snapping off
  await s('Page.addScriptToEvaluateOnNewDocument', { source: `addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important;caret-color:transparent!important}html{scroll-behavior:auto!important}'; document.head.append(st) })` })
  await s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  const evaluate = async expr => {
    const r = await s('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
    return r.result.value
  }
  const idle = async (quiet = 600, max = 20000) => {
    const start = Date.now()
    while (Date.now() - start < max) {
      if (!inflight.size && Date.now() - lastNet > quiet) return
      await sleep(100)
    }
  }
  return {
    s, evaluate, idle, events,
    async viewport(v) {
      await s('Emulation.setDeviceMetricsOverride', { width: v.width, height: v.height, deviceScaleFactor: 1, mobile: v.mobile })
      await s('Emulation.setTouchEmulationEnabled', v.mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false })
      await s('Emulation.setUserAgentOverride', { userAgent: v.mobile ? 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' })
    },
    async go(url) {
      inflight = new Set()
      lastNet = Date.now()
      events.length = 0
      await s('Page.navigate', { url })
      await idle()
      await evaluate('document.fonts.ready.then(() => 1)').catch(() => {})
      await idle(400)
    },
    async shot(file) {
      const { data } = await s('Page.captureScreenshot', { format: 'png' })
      fs.writeFileSync(file, Buffer.from(data, 'base64'))
    },
    close: () => cdp.send('Target.closeTarget', { targetId }),
  }
}

/** Downloads finished after `from` (Chrome's events), renamed from their ids to their own names; the blob a `pdf=1` link then opens (a nameless id) left out */
async function collect(page, downloads, dir, wait) {
  const start = Date.now()
  const done = () => {
    const begun = page.events.filter(e => e.method === 'Browser.downloadWillBegin')
    const finished = new Set(page.events.filter(e => e.method === 'Browser.downloadProgress' && e.params.state !== 'inProgress').map(e => e.params.guid))
    return { begun, all: begun.length > 0 && begun.every(b => finished.has(b.params.guid)) }
  }
  while (Date.now() - start < wait) {
    if (done().all) { await sleep(1200); if (done().all) break }
    await sleep(200)
  }
  const files = []
  for (const b of done().begun) {
    const name = b.params.suggestedFilename
    if (/^[0-9a-f-]{36}(\.\w+)?$/.test(name)) continue
    // The blob a `pdf=1` link opens after saving may come again under the file's name, numbered by Chrome
    if (/ \(?\d+\)?\.\w+$/.test(name) || files.includes(name)) continue
    const from = path.join(downloads, b.params.guid)
    if (!fs.existsSync(from)) continue
    mkdir(dir)
    fs.renameSync(from, path.join(dir, name))
    files.push(name)
  }
  return files
}

// ---------------------------------------------------------------------------------------------------------------------
// The run

async function capture() {
  build()
  const server = await serve()
  const base = `http://127.0.0.1:${server.address().port}`
  const cdp = await launch()
  const downloads = path.join(OUT, '.downloads')
  const scenarios = SCENARIOS.filter(sc => !ONLY || ONLY.some(o => sc.name.startsWith(o)))
  if (ONLY) scenarios.forEach(sc => rm(path.join(RUN, sc.name)))
  else rm(RUN)
  rm(downloads); mkdir(RUN); mkdir(downloads)
  const fixtures = path.join(OUT, 'fixtures')
  mkdir(fixtures)
  for (const [name, rows] of Object.entries(TABLES)) fs.writeFileSync(path.join(fixtures, name), xlsx(rows))

  const page = await openPage(cdp, downloads)
  for (const sc of scenarios) {
    const dir = path.join(RUN, sc.name)
    mkdir(dir)
    process.stdout.write(`  ${sc.name} `)
    for (const [label, v] of [['wide', WIDE], ...(sc.phone ? [['phone', PHONE]] : [])]) {
      await page.viewport(v)
      await page.go(base + sc.url)
      if (sc.expect && label === 'wide') {
        const files = await collect(page, downloads, path.join(dir, 'files'), 30000)
        process.stdout.write(files.length ? `[${files.join(', ')}] ` : '[нет файла] ')
        continue
      }
      if (sc.table) {
        await page.evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Из таблицы')?.click()`)
        await sleep(300)
        const { root } = await page.s('DOM.getDocument', { depth: -1, pierce: true })
        const { nodeId } = await page.s('DOM.querySelector', { nodeId: root.nodeId, selector: 'input[type="file"]' })
        if (nodeId) {
          await page.s('DOM.setFileInputFiles', { nodeId, files: [path.join(fixtures, sc.table)] })
          await page.idle(800)
        } else process.stdout.write('[нет поля файла] ')
      }
      for (const [placeholder, text, pick, nth = 0] of sc.fill ?? []) {
        // A field by its placeholder, or by a selector of what holds it («[data-field="dealer"]»)
        const find = placeholder.startsWith('[')
          ? `[...document.querySelectorAll(${JSON.stringify(placeholder)})].map(e => e.querySelector('input, textarea'))`
          : `[...document.querySelectorAll('input, textarea')].filter(e => e.placeholder === ${JSON.stringify(placeholder)})`
        const ok = await page.evaluate(`(() => { const el = ${find}[${nth}]; if (!el) return false; el.focus(); el.select?.(); return true })()`)
        if (!ok) { process.stdout.write(`[нет поля «${placeholder}»] `); continue }
        await page.s('Input.insertText', { text })
        await sleep(150)
        if (pick) {
          // 'down': the first suggestion lit by ↓ first, as a person picks one from what's typed in part
          if (pick === 'down') {
            await page.s('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 })
            await page.s('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 })
            await sleep(150)
          }
          await page.s('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
          await page.s('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
          await sleep(150)
        }
      }
      if (sc.fill) { await page.evaluate('document.activeElement?.blur()'); await page.idle(400) }
      // Clicks on buttons and links by their text or screen readers' name, as a person would press them
      for (const text of sc.click ?? []) {
        const ok = await page.evaluate(`(() => { const t = ${JSON.stringify(text)}; const el = [...document.querySelectorAll('button, a, [role=tab]')].find(e => e.textContent.trim() === t || e.getAttribute('aria-label') === t); if (!el) return false; el.click(); return true })()`)
        if (!ok) process.stdout.write(`[нет кнопки «${text}»] `)
        await page.idle(500)
        // A click may set the page scrolling smoothly: wait till it stands still
        await page.evaluate(`new Promise(r => { let y = scrollY, still = 0; const t = setInterval(() => { still = scrollY === y ? still + 1 : 0; y = scrollY; if (still >= 5) { clearInterval(t); r(1) } }, 100) })`)
      }
      // A file this run downloaded earlier, dropped back into the generator (its own PDF or ZIP brings the list back)
      if (sc.upload) {
        const file = path.join(RUN, sc.upload)
        await page.evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Из таблицы')?.click()`)
        await sleep(300)
        const { root } = await page.s('DOM.getDocument', { depth: -1, pierce: true })
        const { nodeId } = await page.s('DOM.querySelector', { nodeId: root.nodeId, selector: 'input[type="file"]' })
        if (nodeId && fs.existsSync(file)) { await page.s('DOM.setFileInputFiles', { nodeId, files: [file] }); await page.idle(1000) }
        else process.stdout.write(fs.existsSync(file) ? '[нет поля файла] ' : `[нет файла ${sc.upload}] `)
      }
      if (sc.guide) await guideShots(page, v, dir, label)
      else {
        await sleep(300)
        await page.shot(path.join(dir, `${label}.png`))
      }
      // What the page says, the download's state among it
      const text = await page.evaluate(`document.title + '\\n\\n' + document.body.innerText`)
      fs.writeFileSync(path.join(dir, `${label}.txt`), text)
      if (sc.download && label === 'wide') {
        page.events.length = 0
        // The download, or the first item's template icon
        const pressed = await page.evaluate(sc.download === 'template'
          ? `(() => { const b = document.querySelector('button[data-template]'); if (!b || b.disabled) return null; b.click(); return 'template' })()`
          : `(() => { const b = [...document.querySelectorAll('button')].find(b => /^Скачать (PDF|ZIP)/.test(b.textContent.trim())); if (!b) return null; b.click(); return b.textContent.trim() })()`)
        if (pressed) {
          const files = await collect(page, downloads, path.join(dir, 'files'), 60000)
          process.stdout.write(files.length ? `[${files.join(', ')}] ` : '[нет файла] ')
        } else process.stdout.write('[скачать нельзя] ')
      }
    }
    const errors = page.events.filter(e => e.error).map(e => e.error)
    if (errors.length) fs.writeFileSync(path.join(dir, 'errors.txt'), errors.join('\n\n'))
    log('')
  }
  await page.close()
  await cdp.close()
  server.close()
  rm(downloads)
}

/** The guide as screens, top to bottom; lazy pictures given time to come in */
async function guideShots(page, v, dir, label) {
  const height = await page.evaluate('document.documentElement.scrollHeight')
  // Down the page once, so every lazy picture loads, then back
  for (let y = 0; y < height; y += v.height) { await page.evaluate(`scrollTo(0, ${y})`); await sleep(60) }
  await page.idle(800)
  await page.evaluate(`Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r })))`)
  await page.evaluate(`document.querySelectorAll('video').forEach(v => { v.pause(); v.removeAttribute('autoplay') })`)
  const total = await page.evaluate('document.documentElement.scrollHeight')
  fs.writeFileSync(path.join(dir, `${label}-height.txt`), String(total))
  for (let i = 0, y = 0; y < total; i++, y += v.height) {
    await page.evaluate(`scrollTo(0, ${y})`)
    await sleep(250)
    await page.shot(path.join(dir, `${label}-${String(i).padStart(2, '0')}.png`))
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// The comparison

const walk = dir => fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).filter(f => fs.statSync(path.join(dir, f)).isFile()).sort() : []

/** Differing pixels of two pictures, the picture of the difference saved where they differ */
function compareImages(a, b, diff) {
  if (fs.readFileSync(a).equals(fs.readFileSync(b))) return 0
  try {
    execFileSync('magick', ['compare', '-metric', 'AE', a, b, diff], { stdio: 'pipe' })
    return 0
  } catch (e) {
    const n = parseFloat(String(e.stderr))
    if (!Number.isNaN(n)) return n
    const [sa, sb] = [size(a), size(b)]
    return sa && sb ? `другой размер: ${sa} → ${sb}` : `не картинка: ${sa ? 'стал' : 'был'} битым (${fs.statSync(sa ? b : a).size} байт)`
  }
}
const size = f => { try { return execFileSync('magick', ['identify', '-format', '%wx%h', f], { stdio: 'pipe' }).toString() } catch { return '' } }

/**
 * A PDF without what changes every time it's made, its dates and id, its streams unpacked (the dates may sit in a
 * packed object stream)
 */
function stablePdf(buf) {
  const text = buf.toString('latin1')
  const parts = []
  let last = 0
  for (const m of text.matchAll(/>>\s*stream\r?\n/g)) {
    const start = m.index + m[0].length
    const end = text.indexOf('endstream', start)
    if (end < 0) break
    let body
    try { body = zlib.inflateSync(buf.subarray(start, end), { finishFlush: zlib.constants.Z_SYNC_FLUSH }).toString('latin1') } catch { body = text.slice(start, end) }
    parts.push(text.slice(last, start), body)
    last = end
  }
  parts.push(text.slice(last))
  return parts.join('')
    .replace(/\/(CreationDate|ModDate) *\([^)]*\)/g, '').replace(/\/ID *\[[^\]]*\]/g, '')
    .replace(/<xmp:(CreateDate|ModifyDate|MetadataDate)>[^<]*</g, '<')
    // Lengths and offsets move with what was taken out
    .replace(/\/Length \d+/g, '').replace(/^\d{10} \d{5} [nf]/gm, '').replace(/startxref\s+\d+/, '').replace(/\/(First|Prev) \d+/g, '')
    .replace(/^(\d+ \d+ )+/gm, '').replace(/\/Type \/XRef[\s\S]*?endstream/g, '')
}

function comparePdf(a, b, diffDir, name) {
  const A = fs.readFileSync(a), B = fs.readFileSync(b)
  if (stablePdf(A) === stablePdf(B)) return []
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'brand-pdf-'))
  const pages = f => execFileSync('pdfinfo', [f]).toString().match(/Pages:\s+(\d+)/)?.[1]
  const out = []
  const pa = pages(a), pb = pages(b)
  if (pa !== pb) out.push(`${name}: страниц было ${pa}, стало ${pb}`)
  for (const [f, p] of [[a, 'a'], [b, 'b']]) execFileSync('pdftoppm', ['-png', '-scale-to', '1600', f, path.join(tmp, p)])
  const imgs = fs.readdirSync(tmp).filter(f => f.startsWith('a')).sort()
  for (const img of imgs) {
    const other = path.join(tmp, 'b' + img.slice(1))
    if (!fs.existsSync(other)) continue
    mkdir(diffDir)
    const diff = path.join(diffDir, `${name.replace(/\//g, '_')}-${img.slice(2)}`)
    const n = compareImages(path.join(tmp, img), other, diff)
    if (n) out.push(`${name}, стр. ${parseInt(img.match(/(\d+)\.png$/)[1])}: ${typeof n === 'number' ? `${Math.ceil(n)} пикс. отличаются` : n} → ${path.relative(ROOT, diff)}`)
    else rm(diff)
  }
  if (!out.length) out.push(`${name}: страницы совпали картинкой, но внутри файл другой (текст, данные, метаданные)`)
  rm(tmp)
  return out
}

function compareFile(rel, a, b, diffDir) {
  const ext = path.extname(rel).toLowerCase()
  if (ext === '.pdf') return comparePdf(a, b, diffDir, rel)
  if (['.png', '.jpg', '.webp'].includes(ext)) {
    mkdir(diffDir)
    const diff = path.join(diffDir, rel.replace(/\//g, '_'))
    const n = compareImages(a, b, diff)
    if (!n) { rm(diff); return [] }
    return [`${rel}: ${typeof n === 'number' ? `${Math.ceil(n)} пикс. отличаются` : n} → ${path.relative(ROOT, diff)}`]
  }
  if (ext === '.zip') {
    const za = unzipSync(fs.readFileSync(a)), zb = unzipSync(fs.readFileSync(b))
    const out = []
    const names = [...new Set([...Object.keys(za), ...Object.keys(zb)])].sort()
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'brand-zip-'))
    for (const n of names) {
      if (!za[n]) { out.push(`${rel} › ${n}: новый файл`); continue }
      if (!zb[n]) { out.push(`${rel} › ${n}: файла больше нет`); continue }
      const fa = path.join(tmp, 'a', n), fb = path.join(tmp, 'b', n)
      mkdir(path.dirname(fa)); mkdir(path.dirname(fb))
      fs.writeFileSync(fa, za[n]); fs.writeFileSync(fb, zb[n])
      out.push(...compareFile(`${rel} › ${n}`, fa, fb, diffDir))
    }
    rm(tmp)
    return out
  }
  if (fs.readFileSync(a).equals(fs.readFileSync(b))) return []
  if (['.txt', '.svg', '.json', '.csv', '.md'].includes(ext)) return [`${rel}: ${textDiff(fs.readFileSync(a, 'utf8'), fs.readFileSync(b, 'utf8'))}`]
  return [`${rel}: файл другой`]
}

/** The first line that differs, both ways */
function textDiff(a, b) {
  const la = a.split('\n'), lb = b.split('\n')
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    if (la[i] !== lb[i]) return `строка ${i + 1}: «${(la[i] ?? '').slice(0, 120)}» → «${(lb[i] ?? '').slice(0, 120)}»`
  }
  return 'другой'
}

function compare() {
  const base = path.join(OUT, 'baseline')
  const diffRoot = path.join(OUT, 'diff')
  rm(diffRoot)
  rm(path.join(OUT, 'report.txt'))
  const lines = []
  const scenarios = SCENARIOS.filter(sc => !ONLY || ONLY.some(o => sc.name.startsWith(o)))
  let same = 0
  for (const sc of scenarios) {
    const a = path.join(base, sc.name), b = path.join(RUN, sc.name)
    const files = [...new Set([...walk(a), ...walk(b)])].sort()
    const out = []
    for (const rel of files) {
      const fa = path.join(a, rel), fb = path.join(b, rel)
      if (!fs.existsSync(fa)) { out.push(`${rel}: новый`); continue }
      if (!fs.existsSync(fb)) { out.push(`${rel}: пропал`); continue }
      out.push(...compareFile(rel, fa, fb, path.join(diffRoot, sc.name)))
    }
    // A page that broke loses every screen: the first few say enough
    if (out.length) lines.push(`✗ ${sc.name}`, ...out.slice(0, 8).map(l => `    ${l}`), ...(out.length > 8 ? [`    … и ещё ${out.length - 8}`] : []))
    else same++
  }
  const head = lines.length ? `Отличается: ${scenarios.length - same} из ${scenarios.length}` : `Совпало: все ${scenarios.length}`
  const report = [head, ...lines].join('\n')
  fs.writeFileSync(path.join(OUT, 'report.txt'), report + '\n')
  log('\n' + report)
  return lines.length === 0
}

if (!fs.existsSync(chromePath())) { console.error('Нет Chrome'); process.exit(2) }
// A run that fails leaves no report of an earlier one behind
rm(path.join(OUT, 'report.txt'))
if (!args.includes('--compare-only')) await capture()
if (BASELINE) log(`\nЭталон снят: ${path.relative(ROOT, RUN)}`)
else if (BRAND !== DEFAULT_BRAND) log(`\nСнято: ${path.relative(ROOT, RUN)}`)
else process.exit(compare() ? 0 : 1)
