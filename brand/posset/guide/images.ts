export const images = import.meta.glob<string>('./images/*.{webp,svg}', { eager: true, import: 'default' })
