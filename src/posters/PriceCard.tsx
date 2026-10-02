import svgUmo8 from '@/icons/umo8-badge'
import svgUmo5 from '@/icons/umo5-badge'
import { cards, type Variant } from './cardData'

interface Props {
  variant: Variant
  fullPrice: string
  /** Leave out for a card with no credit offer: one price, under «Цена:» */
  creditPrice?: string
  qrSvg?: string
  /** Replaces the print-resolution car photo, e.g. with a small preview on the brand guide page. */
  image?: string
}

function PriceRow({ value, large }: { value: string; large?: boolean }) {
  // `large`: the headline's size, on a line as tall as the type
  const lh = large ? 'leading-none' : 'leading-[1.25]'
  return (
    <div className={`content-stretch flex font-['CoFo_Sans',sans-serif] font-medium items-center leading-[0] relative shrink-0 w-full whitespace-nowrap ${large ? 'gap-[24px] text-[96px]' : 'gap-[18px] text-[72px]'}`}>
      <div className="flex flex-col justify-end relative shrink-0" style={{ fontFeatureSettings: '"lnum" 1, "tnum" 1' }}>
        <p className={lh}>{value}</p>
      </div>
      <div className="flex flex-col justify-end relative shrink-0">
        <p className={lh}>₽</p>
      </div>
    </div>
  )
}

/**
 * Where a lone price goes: as large as the headline, its figures standing on the QR code's bottom line. The code's
 * dark modules end a quiet-zone module above its 250 px box at 1570; the module count (27 for a short link) is in the
 * SVG's viewBox. Above the figures' baseline: the label's line (40 × 1.13), the gap, and 0.844 em of the 96 px line
 * (CoFo Sans: ascender 0.974, descender 0.286 em).
 */
function singlePriceTop(qrSvg?: string) {
  const modules = Number(qrSvg?.match(/viewBox="0 0 (\d+)/)?.[1]) || 27
  const qrLine = 1570 + 250 - 250 / modules
  return qrLine - (40 * 1.13 + 15 + 96 * 0.844)
}

export default function PriceCard({ variant, fullPrice, creditPrice, qrSvg, image }: Props) {
  const data = cards[variant]
  const carImage = image ?? data.image
  const svg = data.model === 'umo8' ? svgUmo8 : svgUmo5

  return (
    <div className="bg-white relative" style={{ width: 1754, height: 2480 }}>

      {/* UMO logo */}
      <div className="absolute h-[80px] left-[100px] top-[100px] w-[400px]">
        <svg className="absolute block inset-0 size-full" fill="none" height="80" preserveAspectRatio="none" viewBox="0 0 400 80" width="400">
          <path d={svg.p1d33e500} fill="black" />
          <path d={svg.pe682d00} fill="black" />
          <path clipRule="evenodd" d={svg.p10077300} fill="black" fillRule="evenodd" />
        </svg>
      </div>

      {/* Model number */}
      {data.model === 'umo8' ? (
        <div className="absolute h-[80px] left-[540px] top-[100px] w-[100px]">
          <svg className="absolute block inset-0 size-full" fill="none" height="80" preserveAspectRatio="none" viewBox="0 0 100 80" width="100">
            <path d={svgUmo8.p1b67d8f0} fill="black" />
          </svg>
        </div>
      ) : (
        <div className="absolute h-[80px] left-[540px] top-[100px] w-[92px]">
          <svg className="absolute block inset-0 size-full" fill="none" height="80" preserveAspectRatio="none" viewBox="0 0 92 80" width="92">
            <path d={svgUmo5.pac8b300} fill="black" />
          </svg>
        </div>
      )}

      {/* Car image */}
      <div className="-translate-x-1/2 absolute bottom-0 h-[560px] left-1/2 overflow-clip w-[1754px]">
        {data.model === 'umo8' ? (
          <div className="-translate-x-1/2 -translate-y-1/2 absolute h-[990px] left-1/2 top-1/2 w-[1760px]">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={carImage} />
          </div>
        ) : (
          <div className="-translate-x-1/2 absolute bottom-[-95px] h-[1080px] left-1/2 w-[1920px]">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={carImage} />
          </div>
        )}
      </div>

      {/* Headline */}
      <div className="[word-break:break-word] absolute leading-[0] left-[100px] not-italic text-[96px] text-black top-[280px] w-[1554px]" style={{ fontFamily: "'Geist Y', 'CoFo Sans', sans-serif" }}>
        {data.model === 'umo8' ? (
          <>
            <p className="font-['CoFo_Sans',sans-serif] font-medium leading-[1.25] mb-0">Гибридный кроссовер</p>
            <p>
              <span className="font-['CoFo_Sans',sans-serif] font-medium leading-[1.25]">с Алисо</span>
              <span className="font-['CoFo_Sans',sans-serif] font-medium leading-[1.25] tracking-[-9.6px]">й</span>
              <span className="font-['CoFo_Sans',sans-serif] font-medium leading-[1.25]">{' '}</span>
              <span className="leading-[1.25] text-[#7a55ff]">☺</span>
              <span className="font-['CoFo_Sans',sans-serif] font-medium leading-[1.25]">
                {' и сервисами Яндекса.'}
                <br aria-hidden />
                {'Запас хода до 867 км, разгон до 100 км/ч за 6,7 секунды'}
              </span>
            </p>
          </>
        ) : (
          <p>
            <span className="font-['CoFo_Sans',sans-serif] font-medium leading-[1.25]">Технологичный электромобиль с Алисо</span>
            <span className="font-['CoFo_Sans',sans-serif] font-medium leading-[1.25] tracking-[-9.6px]">й</span>
            <span className="font-['CoFo_Sans',sans-serif] font-medium leading-[1.25]">{' '}</span>
            <span className="leading-[1.25] text-[#7a55ff]">☺</span>
            <span className="font-['CoFo_Sans',sans-serif] font-medium leading-[1.25]">{' и сервисами Яндекса. Запас хода до 420 км, разгон до 100 км/ч за 8,7 секунды'}</span>
          </p>
        )}
      </div>

      {/* Description */}
      <div className="[word-break:break-word] absolute content-stretch flex flex-col font-['CoFo_Sans',sans-serif] font-medium gap-[30px] items-start left-[100px] text-black top-[835px] w-[1554px]">
        <p className="leading-[1.13] text-[#666] relative shrink-0 text-[40px] w-full">{data.trimLabel}</p>
        <p className="leading-[1.25] relative shrink-0 text-[60px] w-full">
          {data.descriptionLines.map((line, i) => (
            <span key={i}>
              {i > 0 && <br aria-hidden />}
              {line}
            </span>
          ))}
        </p>
      </div>

      {/* Prices */}
      {creditPrice === undefined ? (
        <div className="[word-break:break-word] absolute content-stretch flex flex-col gap-[15px] items-start left-[100px] text-black" style={{ top: singlePriceTop(qrSvg) }}>
          <p className="font-['CoFo_Sans',sans-serif] font-medium leading-[1.13] text-[#666] relative shrink-0 text-[40px] w-full">Цена:</p>
          <PriceRow value={fullPrice} large />
        </div>
      ) : (
        <div className="[word-break:break-word] absolute content-stretch flex flex-col gap-[30px] items-start left-[100px] text-black top-[1505px]">
          <div className="content-stretch flex flex-col gap-[15px] items-start relative shrink-0">
            <p className="font-['CoFo_Sans',sans-serif] font-medium leading-[1.13] text-[#666] relative shrink-0 text-[40px] w-full">Без кредита:</p>
            <PriceRow value={fullPrice} />
          </div>
          <div className="content-stretch flex flex-col gap-[15px] items-start relative shrink-0">
            <p className="font-['CoFo_Sans',sans-serif] font-medium leading-[1.13] text-[#666] relative shrink-0 text-[40px] w-full">В кредит с субсидией:</p>
            <PriceRow value={creditPrice} />
          </div>
        </div>
      )}

      {/* QR code */}
      <div className="absolute left-[1404px] size-[250px] top-[1570px]">
        {qrSvg
          ? <div className="absolute inset-0" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          : <svg className="absolute block inset-0 size-full" fill="none" height="250" preserveAspectRatio="none" viewBox="0 0 250 250" width="250">
              <path d={svg.pc82700} fill="black" />
              <path d={svg.p1145fa30} stroke="black" strokeWidth="10" />
            </svg>
        }
      </div>

      {/* Disclaimer */}
      <div className="-translate-y-full [word-break:break-word] absolute flex flex-col font-['CoFo_Sans',sans-serif] font-normal justify-end leading-[0] left-[100px] text-[20px] text-white/60 top-[2420px] whitespace-nowrap">
        <p className="leading-[1.1]">* Подробности уточняйте у менеджеров отдела продаж новых автомобилей. Не является публичной офертой</p>
      </div>

    </div>
  )
}
