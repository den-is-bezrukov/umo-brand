import { useState } from 'react'
import { findDealers, knowsEveryWord, withoutUmo, type Dealer } from '@/data/dealers'
import { outlined } from './form'
import { goal } from './metrika'
import { linkParams } from './share'

/**
 * The dealer a `pdf=1` link brings found by the page, so whoever made the link needn't spell it exactly: it may carry
 * the dealer's words as said («агат во владимире»), and before the generator reads the link they become the dealer's
 * name («АГАТ Владимир»): `findDealers` by any spelling, city or street. One found with every word known: put in. One
 * found with a word no dealer has («Рольф Сити»), or several: the person picks here, before the file. None, or «Моего
 * салона нет в списке»: the editor opens instead of the file, the words in the dealer's field, for the person to write
 * the name as on the sign: the link's maker can't tell the dealer wasn't found, and a card or frame goes to its maker. A link
 * with no `pdf` is someone's editor and is left as it is, as its name may be the dealer's own line. Metrika's
 * `dealer_link` says how it went: `found`, `picked` (of `choices`), `none` with the words, to add the dealers and names
 * missing
 */
export default function LinkDealer({ param, withUmo, children }: { param: string; /** The name with «UMO», as the livery puts it on the car */ withUmo?: boolean; children: React.ReactNode }) {
  const [state, setState] = useState<{ said: string; choices: Dealer[] } | null>(() => {
    const params = linkParams()
    const said = params.get(param)?.trim()
    if (!said || !params.has('pdf')) return null
    const found = findDealers(said)
    if (found.length === 1 && knowsEveryWord(said)) {
      put(param, found[0], withUmo)
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
  const pick = (d?: Dealer) => {
    if (d) put(param, d, withUmo)
    else toEditor()
    goal('dealer_link', d ? { result: 'picked', choices: choices.length } : { result: 'none', choices: choices.length, said: said.slice(0, 100) })
    setState(null)
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-[400px] flex-col justify-center gap-6 px-4 py-10">
      <h1 className="text-[20px] font-medium leading-6">{choices.length > 1 ? 'Какой у вас салон?' : 'Это ваш салон?'}</h1>
      <div className="flex flex-col gap-2">
        {choices.map(d => (
          <button key={d.name} type="button" onClick={() => pick(d)} className={`${outlined} flex-col items-start! gap-0.5 text-left`}>
            <span>UMO {withoutUmo(d.name)}</span>
            {d.address && <span className="font-normal text-[#808080]">{d.address}</span>}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => pick()} className="cursor-pointer self-start text-[14px] leading-5 text-[#808080] hover:text-black">
        Моего салона нет в списке
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

/** The link with the dealer's name in place of what was said, for the generator to read */
function put(param: string, d: Dealer, withUmo?: boolean) {
  const url = new URL(location.href)
  url.searchParams.set(param, withUmo ? d.name : withoutUmo(d.name))
  history.replaceState(history.state, '', url)
}
