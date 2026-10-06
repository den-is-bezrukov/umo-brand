import dealers from './dealers.json'

/** Dealers' marketing names as umo.auto lists them («UMO АГАТ Владимир»), alphabetical: suggestions for the dealer fields */
export const DEALER_NAMES = [...new Set(dealers.map(d => d.name))].sort((a, b) => a.localeCompare(b, 'ru'))

/** The same without the «UMO » they all start with («АГАТ Владимир») */
export const withoutUmo = (name: string) => name.replace(/^UMO\s+/, '')
