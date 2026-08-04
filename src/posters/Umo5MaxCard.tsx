import svgPaths from '@/imports/Umo5MaxPriceCard/svg-szajy8s6b9'
import imgCar from '@/imports/Umo5MaxPriceCard/9fcb9c444b55ba3b1cd91fa39d0c11dbdbbdbe24.png'

interface Props { fullPrice: string; creditPrice: string; qrSvg?: string }

function PriceRow({ value }: { value: string }) {
  return (
    <div className="content-stretch flex font-['Geist',sans-serif] font-semibold items-center leading-[0] relative shrink-0 text-[72px] w-full whitespace-nowrap">
      <div className="flex flex-col justify-end relative shrink-0" style={{ fontFeatureSettings: '"lnum" 1, "tnum" 1' }}>
        <p className="leading-[1.25]">{value}</p>
      </div>
      <div className="flex flex-col justify-end relative shrink-0">
        <p className="leading-[1.25]">{' ₽'}</p>
      </div>
    </div>
  )
}

export default function Umo5MaxCard({ fullPrice, creditPrice, qrSvg }: Props) {
  return (
    <div className="bg-white relative" style={{ width: 1754, height: 2480 }}>
      {/* UMO logo */}
      <div className="absolute h-[80px] left-[100px] top-[100px] w-[400px]">
        <svg className="absolute block inset-0 size-full" fill="none" height="80" preserveAspectRatio="none" viewBox="0 0 400 80" width="400">
          <path d={svgPaths.p1d33e500} fill="black" />
          <path d={svgPaths.pe682d00} fill="black" />
          <path clipRule="evenodd" d={svgPaths.p10077300} fill="black" fillRule="evenodd" />
        </svg>
      </div>

      {/* Model number "5" */}
      <div className="absolute bottom-[92.74%] right-[100px] top-[4.03%] w-[92px]">
        <svg className="absolute block inset-0 size-full" fill="none" height="80" preserveAspectRatio="none" viewBox="0 0 92 80" width="92">
          <path d={svgPaths.pac8b300} fill="black" />
        </svg>
      </div>

      {/* Car image */}
      <div className="-translate-x-1/2 absolute bottom-0 h-[560px] left-1/2 overflow-clip w-[1754px]">
        <div className="-translate-x-1/2 absolute bottom-[-100px] h-[990px] left-1/2 w-[1760px]">
          <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgCar} />
        </div>
      </div>

      {/* Headline */}
      <p className="[word-break:break-word] absolute leading-[0] left-[100px] not-italic text-[90px] text-black top-[280px] w-[1554px]" style={{ fontFamily: "'Geist Y', 'Geist', sans-serif" }}>
        <span className="[word-break:break-word] font-['Geist',sans-serif] font-medium leading-[1.33]">Технологичный электромобиль с Алисо</span>
        <span className="[word-break:break-word] font-['Geist',sans-serif] font-medium leading-[1.33] tracking-[-1.6px]">й</span>
        <span className="[word-break:break-word] font-['Geist',sans-serif] font-medium leading-[1.33]">{` `}</span>
        <span className="leading-[1.33]">☺</span>
        <span className="[word-break:break-word] font-['Geist',sans-serif] font-medium leading-[1.33]">{` и сервисами Яндекса. Запас хода до 420 км, разгон до 100 км/ч за 8,7 секунды`}</span>
      </p>

      {/* Description */}
      <div className="[word-break:break-word] absolute content-stretch flex flex-col font-['Geist',sans-serif] font-medium gap-[30px] items-start left-[100px] text-black top-[835px] w-[1554px]">
        <p className="leading-[1.25] min-w-full opacity-60 relative shrink-0 text-[36px] w-[min-content]">Это комплектация Макс:</p>
        <p className="leading-[1.38] relative shrink-0 text-[54px] w-[1554px]">
          Всё нужное для комфортной городской жизни: Алиса помогает за рулем, система интеллектуального вождения с адаптивным круиз-контролем и панорамная крыша, которая наполняет салон светом.
          <br aria-hidden />
          Атмосферная подсветка салона, 18-дюймовые диски и рейлинги на крыше подчеркивают характер автомобиля.
        </p>
      </div>

      {/* Prices */}
      <div className="[word-break:break-word] absolute content-stretch flex flex-col gap-[30px] items-start left-[100px] text-black top-[1505px]">
        <div className="content-stretch flex flex-col gap-[15px] items-start relative shrink-0">
          <p className="font-['Geist',sans-serif] font-medium leading-[1.25] opacity-60 relative shrink-0 text-[36px] w-full">Полная цена:</p>
          <PriceRow value={fullPrice} />
        </div>
        <div className="content-stretch flex flex-col gap-[15px] items-start relative shrink-0">
          <p className="font-['Geist',sans-serif] font-medium leading-[1.25] opacity-60 relative shrink-0 text-[36px] w-full">В кредит с субсидией:</p>
          <PriceRow value={creditPrice} />
        </div>
      </div>

      {/* QR code */}
      <div className="absolute left-[1404px] size-[250px] top-[1570px]">
        {qrSvg
          ? <div className="absolute inset-0" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          : <svg className="absolute block inset-0 size-full" fill="none" height="250" preserveAspectRatio="none" viewBox="0 0 250 250" width="250">
              <path d={svgPaths.pc82700} fill="black" />
              <path d={svgPaths.p1145fa30} stroke="black" strokeWidth="10" />
            </svg>
        }
      </div>

      {/* Disclaimer */}
      <div className="-translate-y-full [word-break:break-word] absolute flex flex-col font-['Geist',sans-serif] font-normal justify-end leading-[0] left-[100px] text-[18px] text-white top-[2420px] whitespace-nowrap">
        <p className="leading-[1.1]">* Подробности уточняйте у менеджеров отдела продаж новых автомобилей. Не является публичной офертой</p>
      </div>
    </div>
  )
}
