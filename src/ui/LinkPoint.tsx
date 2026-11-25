import { useState } from 'react'
import { findPoints, knowsEveryWord, withoutBrand, POINT_PARAM, type Point } from '@/data/points'
import { outlined } from './formUtils'
import { goal } from './metrika'
import { POINTS } from '@brand/points'
import { WORDS } from '@brand/words'
import { linkParams } from './share'

/**
 * The point a `pdf=1` link brings found by the page, so whoever made the link needn't spell it exactly: it may carry
 * the point's words as said («точка во владимире»), and before the generator reads the link they become the point's
 * name («Точка Город»): `findPoints` by any spelling, city or street. One found with every word known: put in. One
 * found with a word no point has («Рольф Сити»), or several: the person picks here, before the file. None, or the brand's «нет в списке»
 * (`WORDS.point.notListed`): the editor opens instead of the file, the words in the point's field, for the person to write
 * the name as on the sign: the link's maker can't tell the point wasn't found, and a card or frame goes to its maker. A link
 * with no `pdf` is someone's editor and is left as it is, as its name may be the point's own line. Metrika's
 * `dealer_link` says how it went: `found`, `picked` (of `choices`), `none` with the words, to add the points and names
 * missing
 */
export default function LinkPoint({ param = POINT_PARAM, withPrefix, children }: { /** The link's word for the point, the brand's (`POINT_PARAM`) unless the generator has its own */ param?: string; /** The name with the brand's prefix (`POINTS.prefix`), as the livery puts it on the car */ withPrefix?: boolean; children: React.ReactNode }) {
  const [state, setState] = useState<{ said: string; choices: Point[] } | null>(() => {
    const params = linkParams()
    const said = params.get(param)?.trim()
    if (!said || !params.has('pdf')) return null
    const found = findPoints(said)
    if (found.length === 1 && knowsEveryWord(said)) {
      put(param, found[0], withPrefix)
      goal('dealer_link', { result: 'found' })
      return null
    }
    if (!found.length) {
      goal('dealer_link', { result: 'none', said: said.slice(0, 100) })
      toEditor()
      return null
    }
    return { said, choices: found }
  })
  if (!state) return children
  const { said, choices } = state
  const pick = (d?: Point) => {
    if (d) put(param, d, withPrefix)
    else toEditor()
    goal('dealer_link', d ? { result: 'picked', choices: choices.length } : { result: 'none', choices: choices.length, said: said.slice(0, 100) })
    setState(null)
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-[400px] flex-col justify-center gap-6 px-4 py-10">
      <h1 className="text-[20px] font-medium leading-6">{choices.length > 1 ? WORDS.point.which : WORDS.point.yours}</h1>
      <div className="flex flex-col gap-2">
        {choices.map(d => (
          <button key={d.name} type="button" onClick={() => pick(d)} data-ui="button" className={`${outlined} flex-col items-start! gap-0.5 text-left`}>
            <span>{`${POINTS.prefix} `}{withoutBrand(d.name)}</span>
            {d.address && <span className="font-normal text-caption">{d.address}</span>}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => pick()} className="cursor-pointer self-start text-[14px] leading-5 text-caption hover:text-ink">
        {WORDS.point.notListed}
      </button>
    </main>
  )
}

/** The link without `pdf`, so the generator opens its editor rather than the file */
function toEditor() {
  const url = new URL(location.href)
  url.searchParams.delete('pdf')
  history.replaceState(history.state, '', url)
}

/** The link with the point's name in place of what was said, for the generator to read */
function put(param: string, d: Point, withPrefix?: boolean) {
  const url = new URL(location.href)
  url.searchParams.set(param, withPrefix ? d.name : withoutBrand(d.name))
  history.replaceState(history.state, '', url)
}
