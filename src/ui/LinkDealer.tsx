import { useState } from 'react'
import { findDealers, knowsEveryWord, withoutUmo, type Dealer } from '@/data/dealers'
import { outlined } from './form'
import { goal } from './metrika'
import { linkParams } from './share'

/**
 * The dealer a chat agent's link brings (`pdf` in it, public/llms.txt) found by the page, so the agent needn't: it passes
 * the dealer's words as said («агат во владимире»), and before the generator reads the link they become the dealer's
 * name («АГАТ Владимир»): `findDealers` by any spelling, city or street. One found with every word known: put in. One
 * found with a word no dealer has («Рольф Сити»), or several: the person picks here, before the file, «Моего салона нет
 * в списке» keeping the words. None: the words stay, as a dealer not in the list. A link with no `pdf` is someone's
 * editor and is left as it is, as its name may be the dealer's own line. Metrika's `dealer_link` says how it went:
 * `found`, `picked` (of `choices`), `none` with the words, to add the dealers and names missing
 */
export default function LinkDealer({ param, children }: { param: string; children: React.ReactNode }) {
  const [state, setState] = useState<{ said: string; choices: Dealer[] } | null>(() => {
    const params = linkParams()
    const said = params.get(param)?.trim()
    if (!said || !params.has('pdf')) return null
    const found = findDealers(said)
    if (found.length === 1 && knowsEveryWord(said)) {
      put(param, found[0])
      goal('dealer_link', { result: 'found' })
      return null
    }
    if (!found.length) {
      goal('dealer_link', { result: 'none', said: said.slice(0, 100) })
      return null
    }
    return { said, choices: found }
  })
  if (!state) return children
  const { said, choices } = state
  const pick = (d?: Dealer) => {
    if (d) put(param, d)
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

/** The link with the dealer's name in place of what was said, for the generator to read */
function put(param: string, d: Dealer) {
  const url = new URL(location.href)
  url.searchParams.set(param, withoutUmo(d.name))
  history.replaceState(history.state, '', url)
}
