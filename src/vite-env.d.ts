/// <reference types="vite/client" />

declare module 'virtual:download-sizes' {
  /** Byte size of each file in public/downloads, keyed by file name (see downloadSizesPlugin in vite.config.ts). */
  const sizes: Record<string, number>
  export default sizes
}
