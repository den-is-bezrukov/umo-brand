import { GeneratorMenu } from '@/ui/form'

/**
 * Печатные материалы: every generator on one screen, as the generators' own menu shows them (see GeneratorMenu), laid
 * out as a generator's form column. The guide's «Печатные материалы» link leads here.
 */
export default function Materials() {
  return (
    <div className="min-h-dvh bg-white font-sans text-black">
      <div className="flex flex-col gap-6 p-6 tracking-[-0.01em] md:w-[321px]">
        <GeneratorMenu />
      </div>
    </div>
  )
}
