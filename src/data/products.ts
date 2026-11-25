import { PRODUCTS } from '@brand/products'

// The brand's products (`@brand/products`: UMO's models), as the price card chooses them

export { PRODUCTS }

/** The default product, the first; none for a brand without products */
export const DEFAULT_PRODUCT = PRODUCTS[0]?.id ?? ''

/** A product by its id */
export const productOf = (id: string) => PRODUCTS.find(m => m.id === id) ?? PRODUCTS[0]

/** The product a link names, the default for none or one the brand hasn't */
export const productFrom = (id: string | null) => (PRODUCTS.some(m => m.id === id) ? id! : DEFAULT_PRODUCT)

/** A name for a file: «<Бренд> 5» as <Brand>-5 (`sep` '-') or <Brand>5 ('') */
export const asFile = (name: string, sep = '-') => name.replace(/\s+/g, sep)

/** A product's name for a file */
export const fileName = (id: string, sep = '-') => asFile(productOf(id).name, sep)
