import { LIVERY } from '@brand/livery'

// The livery's surfaces: the mechanics (`surface.ts`) and the brand's cars (`@brand/livery`), apart so the brand's
// data can use the mechanics' helpers without a loop

export * from './surface'

/** Each model's surfaces */
export const LIVERIES = LIVERY.surfaces
