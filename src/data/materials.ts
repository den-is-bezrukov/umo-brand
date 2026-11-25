import { GENERATORS } from './generators'
import { SITE } from '@/site'

/**
 * The generators the brand has (`materials` in its site.json; every one without it), in `GENERATORS`' order, named as
 * the brand names them (`names`: «памятка владельца» for the core's «памятка клиента»)
 */
export const MATERIALS = GENERATORS.filter(g => !SITE.materials || SITE.materials.includes(g.path.slice(1)))
  .map(g => ({ ...g, ...SITE.names?.[g.path.slice(1)] }))
