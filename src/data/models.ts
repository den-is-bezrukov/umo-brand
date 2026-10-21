import { MODELS } from '@brand/models'

// The brand's models (`@brand/models`), as the generators choose them

export { MODELS }

/** The default model, the first */
export const DEFAULT_MODEL = MODELS[0].id

/** A model by its id */
export const modelOf = (id: string) => MODELS.find(m => m.id === id) ?? MODELS[0]

/** The model a link names, the default for none or one the brand hasn't */
export const modelFrom = (id: string | null) => (MODELS.some(m => m.id === id) ? id! : DEFAULT_MODEL)

/** The model's name for a file: «<Бренд> 5» as <Brand>-5 (`sep` '-') or <Brand>5 ('') */
export const fileName = (id: string, sep = '-') => modelOf(id).name.replace(/\s+/g, sep)
