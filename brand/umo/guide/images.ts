/** The guide's pictures, by path (`./images/<name>.svg|webp`): Figma's frames exported at 2x, schemes in SVG, photos in WebP */
export const images = import.meta.glob<string>('./images/*.{webp,svg}', { eager: true, import: 'default' })
