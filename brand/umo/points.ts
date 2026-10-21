import type { BrandPoints } from '@/brand'
import site from './points/site.json'
import own from './points/own.json'

/**
 * UMO's dealers: umo.auto's (`points/site.json`, collected by `scripts/fetch-dealers.mjs`) and the hand-kept ones
 * (`points/own.json`): a dealer signed but not on umo.auto yet, with its city and address, or, by the name of one
 * already there, only the names it's also called by («Мажор» for Major), its UMO showroom's phone (umo.auto has none),
 * or anything umo.auto has wrong
 */
export const POINTS: BrandPoints = {
  lists: [site, own],
  prefix: 'UMO',
  words: ['umo', 'умо', 'юмо'],
}
