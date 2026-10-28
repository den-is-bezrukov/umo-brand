import { GENERATORS } from './generators'
import { SITE } from '@/site'

/** The generators the brand has (`materials` in its site.json; every one without it), in `GENERATORS`' order */
export const MATERIALS = GENERATORS.filter(g => !SITE.materials || SITE.materials.includes(g.path.slice(1)))
