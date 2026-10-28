// The guide's pictures by name, for `img()` (`src/guide/parts.tsx`)
export const images = import.meta.glob<string>('./images/*.{webp,svg}', { eager: true, import: 'default' })
