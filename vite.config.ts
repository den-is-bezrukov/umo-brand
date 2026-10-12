import { defineConfig, type HtmlTagDescriptor, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

import siteConfiguration from './site.config.json'

// Vite config — https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const emitSourcemaps = mode === 'development'

  return {
    base: '/',
    build: {
      sourcemap: emitSourcemaps ? 'inline' : false,
      minify: !emitSourcemaps,
    },
    plugins: [
      react(),
      tailwindcss(),
      siteMetaPlugin(siteConfiguration),
      downloadSizesPlugin(),
      aiPagePlugin(),
      reactRefreshBoundaryFallback(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        buffer: 'buffer/',
      },
    },
    define: {
      global: 'globalThis',
    },
    optimizeDeps: {
      include: ['@react-pdf/renderer', 'buffer'],
    },
    server: {
      host: '0.0.0.0',
      port: parseInt(process.env.PORT || '8443'),
      strictPort: true,
    },
    preview: {
      host: '0.0.0.0',
      port: parseInt(process.env.PORT || '8443'),
    },
  }
})

type SiteConfiguration = {
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
  analytics?: {
    googleAnalyticsId?: string
  }
  customScripts?: {
    headStart?: string
    headEnd?: string
    bodyStart?: string
    bodyEnd?: string
  }
  accessibility?: {
    addBypassLinks?: boolean
  }
}

/** Applies site.config.json to the generated document shell. */
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

  const title = config.title ?? "umo-brand"
  const description = config.description ?? ''
  const favicon = config.icons?.icon ?? ''
  const faviconIco = config.icons?.ico ?? ''
  const appleTouchIcon = config.icons?.appleTouchIcon ?? ''
  const socialImage = config.openGraph?.image ?? ''
  const language = sanitizeHtmlValue(config.language) || 'en'
  const googleAnalyticsId = sanitizeHtmlValue(config.analytics?.googleAnalyticsId)
  const headStart = config.customScripts?.headStart ?? ''
  const headEnd = config.customScripts?.headEnd ?? ''
  const bodyStart = config.customScripts?.bodyStart ?? ''
  const bodyEnd = config.customScripts?.bodyEnd ?? ''
  // Chat agents (ChatGPT, Claude) honour robots.txt when they open a link, so the instruction for them stays open
  const robotsTxt = config.robots?.index === false ? 'User-agent: *\nAllow: /llms.txt\nAllow: /dealers.txt\nAllow: /ai\nDisallow: /\n' : ''

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
        result = replaceHtmlCommentSlot(result, 'site:lang', language)
        result = replaceHtmlCommentSlot(result, 'site:title', escapeHtmlText(title))
        result = replaceHtmlCommentSlot(result, 'site:head-start', headStart)
        result = replaceHtmlCommentSlot(result, 'site:head-end', headEnd)
        result = replaceHtmlCommentSlot(result, 'site:body-start', bodyStart)
        result = replaceHtmlCommentSlot(result, 'site:body-end', bodyEnd)

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

        if (googleAnalyticsId) {
          tags.push(
            {
              tag: 'script',
              attrs: {
                async: true,
                src: `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`,
              },
              injectTo: 'head',
            },
            {
              tag: 'script',
              children: `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', ${JSON.stringify(googleAnalyticsId)});
`,
              injectTo: 'head',
            },
          )
        }

        if (config.accessibility?.addBypassLinks) {
          tags.push(
            {
              tag: 'style',
              children: `
  .skip-link {
    position: fixed;
    top: 8px;
    left: 8px;
    z-index: 2147483647;
    transform: translateY(-150%);
    border-radius: 6px;
    background: #111827;
    color: #fff;
    padding: 8px 12px;
    font: 600 14px/1.2 system-ui, sans-serif;
    text-decoration: none;
  }
  .skip-link:focus {
    transform: translateY(0);
  }
`,
              injectTo: 'head',
            },
            {
              tag: 'a',
              attrs: { class: 'skip-link', href: '#root' },
              children: 'Skip to content',
              injectTo: 'body-prepend',
            },
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

/** `virtual:download-sizes`: byte size of every file in public/downloads, keyed by file name. */
/**
 * umo.autos/ai: a plain page, no React, so a chat agent opening it reads the instruction for chat agents
 * (public/llms.txt) that the page holds, as people pick their chat on it. Built from src/ai/page.html
 */
function aiPagePlugin(): Plugin {
  const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const page = () => fs.readFileSync(path.resolve(__dirname, 'src/ai/page.html'), 'utf8')
    .replace('<!-- ai:instruction -->', escape(fs.readFileSync(path.resolve(__dirname, 'public/llms.txt'), 'utf8')))
    .replace('<!-- ai:dealers -->', escape(dealersText()))
  /**
   * umo.autos/dealers.txt: the dealers as umo.auto lists them (src/data/dealers.json), for the agent to check against.
   * Short, as Alice gets it in her link, where it was 41% of the bytes: the name, the city when the name lacks it, the
   * hours as «9–21» (every day) or by days; no address, as the hours sign puts it in by the name itself
   */
  const dealersText = () => {
    const dealers: { name: string; city: string; hours: string }[] = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'src/data/dealers.json'), 'utf8'))
    const hours = (h: string) => h.replace(/^ежедневно,\s*/, '').replace(/0?(\d{1,2}):00/g, '$1')
    return '# UMO dealers, as umo.auto lists them\n\nName (without «UMO»), city — hours («9–21»: every day, 9:00–21:00)\n\n'
      + dealers.map(d => {
        const name = d.name.replace(/^UMO\s+/, '')
        return `${name}${name.includes(d.city) ? '' : `, ${d.city}`} — ${hours(d.hours)}`
      }).sort((a, b) => a.localeCompare(b, 'ru')).join('\n') + '\n'
  }
  return {
    name: 'ai-page',
    configureServer(server) {
      // In dev the page reloads itself when it or the instruction changes, through Vite's client
      const sources = ['src/ai/page.html', 'public/llms.txt', 'src/data/dealers.json'].map(f => path.resolve(__dirname, f))
      server.watcher.add(sources)
      server.watcher.on('change', file => {
        if (sources.includes(file)) server.ws.send({ type: 'full-reload' })
      })
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] === '/dealers.txt') {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          return res.end(dealersText())
        }
        if (!['/ai', '/ai/'].includes(req.url?.split('?')[0] ?? '')) return next()
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(page().replace('</head>', '<script type="module" src="/@vite/client"></script></head>'))
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'ai/index.html', source: page() })
      this.emitFile({ type: 'asset', fileName: 'dealers.txt', source: dealersText() })
    },
  }
}

function downloadSizesPlugin(): Plugin {
  const id = 'virtual:download-sizes'
  const dir = path.resolve(__dirname, 'public/downloads')
  return {
    name: 'download-sizes',
    resolveId: (source) => (source === id ? '\0' + id : null),
    load(source) {
      if (source !== '\0' + id) return null
      const sizes = Object.fromEntries(fs.readdirSync(dir).filter((f) => !f.startsWith('.')).map((f) => [f, fs.statSync(path.join(dir, f)).size]))
      return `export default ${JSON.stringify(sizes)}`
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
