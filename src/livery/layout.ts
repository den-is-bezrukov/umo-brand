import { LIVERY } from '@brand/livery'

// The livery's surfaces: the mechanics (`surface.ts`) and the brand's cars (`@brand/livery`), apart so the brand's
// data can use the mechanics' helpers without a loop

export * from './surface'

/** Each vehicle's surfaces */
export const LIVERIES = LIVERY.surfaces

/** The vehicles, the first the default */
export const VEHICLES = LIVERY.vehicles
export const DEFAULT_VEHICLE = VEHICLES[0]?.id ?? ''
export const vehicleOf = (id: string) => VEHICLES.find(v => v.id === id) ?? VEHICLES[0]
/** The vehicle a link names, the default for none or one the brand hasn't */
export const vehicleFrom = (id: string | null) => (VEHICLES.some(v => v.id === id) ? id! : DEFAULT_VEHICLE)
