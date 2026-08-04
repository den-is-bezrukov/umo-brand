import svgPaths from "@/imports/Umo5MaxPriceholder/svg-u9yxn1a7bo";
import imgRectangle1 from "@/imports/Umo5MaxPriceholder/b48708a1e3b75c3f3b0d783da942f3530b36498c.png";
import imgImage5 from "@/imports/Umo5MaxPriceholder/4463e47a6056ff4d3f0870fe15d8aed7a43ea000.png";

interface Props { fullPrice: string; creditPrice: string; qrSvg?: string }

function Logo() {
  return (
    <div className="absolute h-[131.2px] left-[150px] top-[150px] w-[656px]">
      <svg className="absolute block inset-0 size-full" fill="none" height="131.2" preserveAspectRatio="none" viewBox="0 0 656 131.2" width="656">
        <g>
          <path d="M0 0H656V131.2H0V0Z" fill="white" />
          <path d={svgPaths.p36f0700} fill="black" />
          <path d={svgPaths.p1e2b480} fill="black" />
          <path clipRule="evenodd" d={svgPaths.p3489ed80} fill="black" fillRule="evenodd" />
        </g>
      </svg>
    </div>
  );
}

export default function Umo5Max({ fullPrice, creditPrice, qrSvg }: Props) {
  return (
    <div className="bg-white relative" style={{ width: 2970, height: 4200 }}>
      <Logo />

      {/* Right model number */}
      <div className="absolute bottom-[93.31%] right-[150px] top-[3.57%] w-[152px]">
        <svg className="absolute block inset-0 size-full" fill="none" height="131" preserveAspectRatio="none" viewBox="0 0 152 131" width="152">
          <path d={svgPaths.p35985a80} fill="black" />
        </svg>
      </div>

      {/* Headline */}
      <p className="[word-break:break-word] absolute font-['Geist',sans-serif] font-medium leading-[1.15] left-[165px] text-[160px] text-black top-[484px] w-[2423px] whitespace-pre-wrap">
        {`Технологичный электромобиль с Алисой      `}
        <br aria-hidden />
        {`и сервисами Яндекса.`}
        <br aria-hidden />
        Запас хода до 420 км, разгон до 100 км/ч за 8,7 секунды
      </p>

      {/* Alisa icon */}
      <div className="absolute h-[128px] left-[2196px] top-[696px] w-[133px]">
        <div className="absolute inset-[-5.46%_-5.26%_-5.47%_-5.26%]">
          <svg className="block size-full" fill="none" height="141.992" preserveAspectRatio="none" viewBox="0 0 146.997 141.992" width="146.997">
            <path d={svgPaths.p126a7f00} stroke="black" strokeOpacity="0.9" strokeWidth="14" />
          </svg>
        </div>
      </div>

      {/* Description */}
      <div className="[word-break:break-word] absolute content-stretch flex flex-col font-['Geist',sans-serif] font-medium gap-[38px] items-start left-[165px] text-black top-[1524px] w-[2472px]">
        <p className="leading-[normal] opacity-60 relative shrink-0 text-[60px] w-full">Это комплектация MAX:</p>
        <p className="leading-[1.2] relative shrink-0 text-[100px] w-full">Всё нужное для комфортной городской жизни: Алиса помогает за рулем, система интеллектуального вождения с адаптивным круиз-контролем и панорамная крыша, которая наполняет салон светом. Атмосферная подсветка салона, 18-дюймовые диски и рейлинги на крыше подчеркивают характер автомобиля</p>
      </div>

      {/* Prices */}
      <div className="[word-break:break-word] absolute content-stretch flex flex-col gap-[70px] items-start left-[165px] text-black top-[2580px] w-[751px]">
        <div className="content-stretch flex flex-col gap-[23px] items-start relative shrink-0 w-[719px]">
          <p className="font-['Geist',sans-serif] font-medium leading-[normal] opacity-60 relative shrink-0 text-[60px] w-full">Полная цена:</p>
          <div className="content-stretch flex font-['Geist',sans-serif] font-semibold gap-[10px] items-center leading-[0] relative shrink-0 text-[124.615px] w-full whitespace-nowrap">
            <div className="flex flex-col justify-end relative shrink-0"><p className="leading-[normal]">{fullPrice}</p></div>
            <div className="flex flex-col justify-end relative shrink-0"><p className="leading-[normal]">₽</p></div>
          </div>
        </div>
        <div className="content-stretch flex flex-col gap-[23px] items-start relative shrink-0 w-full">
          <p className="font-['Geist',sans-serif] font-medium leading-[normal] opacity-60 relative shrink-0 text-[60px] w-full">В кредит с субсидией:</p>
          <div className="content-stretch flex font-['Geist',sans-serif] font-semibold gap-[10px] items-center leading-[0] relative shrink-0 text-[124.615px] w-full whitespace-nowrap">
            <div className="flex flex-col justify-end relative shrink-0"><p className="leading-[normal]">{creditPrice}</p></div>
            <div className="flex flex-col justify-end relative shrink-0"><p className="leading-[normal]">₽</p></div>
          </div>
        </div>
      </div>

      {/* Car image / QR code */}
      <div className="absolute h-[489px] left-[2303px] top-[2687px] w-[517px]">
        {qrSvg
          ? <div className="absolute inset-0" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          : <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage5} />
        }
      </div>

      {/* Bottom background */}
      <div className="absolute h-[923px] left-0 top-[3277px] w-[2970px]">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgRectangle1} />
      </div>

      {/* Disclaimer */}
      <div className="-translate-y-full [word-break:break-word] absolute flex flex-col font-['Geist',sans-serif] font-normal justify-end leading-[0] left-[150px] text-[30px] text-white top-[4106px] whitespace-nowrap">
        <p className="leading-[normal]">* Подробности уточняйте у менеджеров отдела продаж новых автомобилей. Не является публичной офертой</p>
      </div>
    </div>
  );
}
