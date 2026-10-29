import type { BrandPoints } from '@/brand'
import { slugOf } from '@/ui/translit'
import { SITE } from '@/site'
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
  // The brand's name as people write it, and what dealers are called, which tell no dealer apart («дилер» is the brand's word)
  words: ['umo', 'умо', 'юмо', 'салон', 'автосалон', 'дилерский', 'дилерство', 'дц'],
  // The links already out name the dealer `dealer`
  param: 'dealer',
  // A dealer's site, offered: its name transliterated, as a subdomain of umo.auto («Дилер Город» → dealer-city.umo.auto),
  // as the Figma card has it; such subdomains don't exist yet, so it's a suggestion, typed over freely
  site: name => { const slug = slugOf(name); return slug ? `${slug}.${new URL(SITE.home).host}` : '' },
}
