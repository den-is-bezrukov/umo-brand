import { defineConfig, type HtmlTagDescriptor, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import opentype from 'opentype.js'

import { GENERATORS } from './src/data/generators'

const brandDir = path.resolve(__dirname, 'brand/umo')
const siteConfiguration: SiteConfiguration = JSON.parse(fs.readFileSync(path.join(brandDir, 'site.json'), 'utf8'))

// Vite config — https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const emitSourcemaps = mode === 'development'

  return {
    base: '/',
    publicDir: path.join(brandDir, 'public'),
    build: {
      sourcemap: emitSourcemaps ? 'inline' : false,
      minify: !emitSourcemaps,
    },
    plugins: [
      react(),
      tailwindcss(),
      siteMetaPlugin(siteConfiguration),
      fontMetrics(brandDir),
      routePages([...GENERATORS.map(g => g.path).filter(p => !siteConfiguration.materials || siteConfiguration.materials.includes(p.slice(1))), '/editor']),
      corePublic(path.resolve(__dirname, 'public')),
      reactRefreshBoundaryFallback(),
    ],
    resolve: {
      alias: {
        '@brand': brandDir,
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: parseInt(process.env.PORT || '5588'),
      strictPort: true,
      // The check's builds (scripts/check.mjs) would reload the open page
      watch: { ignored: ['**/.check.nosync/**'] },
    },
    preview: {
      host: '0.0.0.0',
      port: parseInt(process.env.PORT || '5588'),
    },
  }
})

type SiteConfiguration = {
  /** The generators the brand has, by path (`business-card`); without it, every one */
  materials?: string[]
  /** Where the site lives: the Metrika counter counts there only */
  domain?: string
  /** Yandex.Metrika's counter, none for no counter */
  metrika?: number
  title?: string
  description?: string
  language?: string
  robots?: {
    index?: boolean
  }
  icons?: {
    icon?: string
    ico?: string
    appleTouchIcon?: string
  }
  openGraph?: {
    image?: string
  }
}

/** Applies the brand's site.json to the generated document shell. */
function siteMetaPlugin(config: SiteConfiguration): Plugin {
  function sanitizeHtmlValue(value: string | undefined): string {
    return value?.replace(/[^a-zA-Z0-9_-]/g, '') || ''
  }
  function escapeHtmlText(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
  function replaceHtmlCommentSlot(html: string, slotName: string, content: string): string {
    return html.replace(`<!-- ${slotName} -->`, content)
  }

  const title = config.title ?? ''
  const description = config.description ?? ''
  const favicon = config.icons?.icon ?? ''
  const faviconIco = config.icons?.ico ?? ''
  const appleTouchIcon = config.icons?.appleTouchIcon ?? ''
  const socialImage = config.openGraph?.image ?? ''
  const language = sanitizeHtmlValue(config.language) || 'en'
  const robotsTxt = config.robots?.index === false ? 'User-agent: *\nDisallow: /\n' : ''

  return {
    name: 'site-meta',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!robotsTxt || req.url?.split('?')[0] !== '/robots.txt') return next()

        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end(robotsTxt)
      })
    },
    generateBundle() {
      if (!robotsTxt) return

      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: robotsTxt,
      })
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        let result = html
        // The Metrika counter, the brand's, or nothing
        result = config.metrika
          ? result.replace(/<!-- metrika:start[^>]*-->|<!-- metrika:end -->/g, '').replace(/%METRIKA%/g, String(config.metrika)).replace(/%DOMAIN%/g, config.domain ?? '')
          : result.replace(/ *<!-- metrika:start[\s\S]*?<!-- metrika:end -->\n?/g, '')
        result = replaceHtmlCommentSlot(result, 'site:lang', language)
        result = replaceHtmlCommentSlot(result, 'site:title', escapeHtmlText(title))

        const tags: HtmlTagDescriptor[] = []
        if (description) {
          tags.push({ tag: 'meta', attrs: { name: 'description', content: description }, injectTo: 'head' })
        }
        if (config.robots?.index === false) {
          tags.push({ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' }, injectTo: 'head' })
        }
        // .ico first with sizes="32x32" so browsers that take SVG icons still prefer the SVG one.
        if (faviconIco) {
          tags.push({ tag: 'link', attrs: { rel: 'icon', href: faviconIco, sizes: '32x32' }, injectTo: 'head' })
        }
        if (favicon) {
          const type = favicon.endsWith('.svg') ? 'image/svg+xml' : undefined
          tags.push({ tag: 'link', attrs: { rel: 'icon', href: favicon, ...(type && { type }) }, injectTo: 'head' })
        }
        if (appleTouchIcon) {
          tags.push({ tag: 'link', attrs: { rel: 'apple-touch-icon', href: appleTouchIcon }, injectTo: 'head' })
        }
        if (title) {
          tags.push({ tag: 'meta', attrs: { property: 'og:title', content: title }, injectTo: 'head' })
        }
        if (description) {
          tags.push({ tag: 'meta', attrs: { property: 'og:description', content: description }, injectTo: 'head' })
        }
        if (socialImage) {
          tags.push(
            { tag: 'meta', attrs: { property: 'og:image', content: socialImage }, injectTo: 'head' },
            { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' }, injectTo: 'head' },
            { tag: 'meta', attrs: { name: 'twitter:image', content: socialImage }, injectTo: 'head' },
          )
        }

        return {
          html: result,
          tags,
        }
      },
    },
  }
}

/**
 * A copy of index.html per route (`memo.html`), which GitHub Pages serves at `/memo` with a 200. Without it a route
 * is answered by 404.html (public/), a 404 that redirects to `/`: people see the page, but link previews in
 * messengers and search engines see a missing one.
 */
function routePages(paths: string[]): Plugin {
  return {
    name: 'route-pages',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const index = bundle['index.html']
      if (index?.type !== 'asset') return

      for (const p of paths) {
        this.emitFile({ type: 'asset', fileName: `${p.slice(1)}.html`, source: index.source })
      }
    },
  }
}

/**
 * `virtual:font-metrics`: the brand type's measures, read from its font file, in em: `cap` the capitals' height (the
 * font's own, OS/2), `ascent` and `descent` the line box Figma puts a line in (hhea), `descender` the deepest descender of
 * the Cyrillic (р у д ж ф ц; the Latin p g q y where the font has none). The font is the first TrueType or OpenType file
 * the brand's `fonts.ts` names, found in its `public/`
 */
function fontMetrics(brandDir: string): Plugin {
  const id = 'virtual:font-metrics'
  return {
    name: 'font-metrics',
    resolveId: source => (source === id ? '\0' + id : null),
    load(loaded) {
      if (loaded !== '\0' + id) return null
      const fonts = path.join(brandDir, 'fonts.ts')
      const name = /['"]([^'"]+\.(?:ttf|otf))['"]/.exec(fs.readFileSync(fonts, 'utf8'))?.[1]
      if (!name) throw new Error(`${fonts} names no .ttf or .otf file to measure`)
      const file = path.join(brandDir, 'public', name)
      this.addWatchFile(file)
      const bytes = fs.readFileSync(file)
      const font = opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
      const em = font.unitsPerEm
      const round = (units: number) => Math.round((units / em) * 1000) / 1000
      const depth = (letters: string) => -Math.min(...[...letters].map(c => font.charToGlyph(c).getBoundingBox().y1))
      const cyrillic = depth('рудж\u0444ц')
      const metrics = {
        cap: round(font.tables.os2.sCapHeight),
        ascent: round(font.tables.hhea.ascender),
        descent: round(-font.tables.hhea.descender),
        descender: round(cyrillic > 0 ? cyrillic : depth('pgqy')),
      }
      return `export const METRICS = ${JSON.stringify(metrics)}`
    },
  }
}

/** The core's own files at the site's root (404.html), beside the brand's `public/`, which Vite serves as the root */
function corePublic(dir: string): Plugin {
  return {
    name: 'core-public',
    apply: 'build',
    generateBundle() {
      for (const file of fs.readdirSync(dir)) this.emitFile({ type: 'asset', fileName: file, source: fs.readFileSync(path.join(dir, file)) })
    },
  }
}

/**
 * Reload when a module that previously defined a React Refresh boundary stops
 * defining one. This happens when a refactor moves a component into a new
 * file and replaces the old module with a re-export:
 *
 *   export { default } from './app/App'
 *
 * Vite otherwise accepts the update using the previous module's HMR boundary,
 * but the re-export-only transform no longer registers a replacement for the
 * mounted component family. React reports a successful refresh while leaving
 * the old tree mounted until the page is reloaded.
 */
function reactRefreshBoundaryFallback(): Plugin {
  const hadRefreshBoundary = new Map<string, boolean>()
  let sendFullReload: (() => void) | null = null

  return {
    name: 'react-refresh-boundary-fallback',
    apply: 'serve',
    enforce: 'post',
    configureServer(server) {
      sendFullReload = () => server.ws.send({ type: 'full-reload', path: '*' })
    },
    transform(code, id) {
      if (!/\.[jt]sx?(?:\?|$)/.test(id) || id.includes('/node_modules/')) return null

      const moduleId = id.split('?')[0] ?? id
      const hasRefreshBoundary = code.includes('registerExportsForReactRefresh')
      const previousHadRefreshBoundary = hadRefreshBoundary.get(moduleId)
      hadRefreshBoundary.set(moduleId, hasRefreshBoundary)

      if (previousHadRefreshBoundary && !hasRefreshBoundary) {
        queueMicrotask(() => sendFullReload?.())
      }

      return null
    },
  }
}
