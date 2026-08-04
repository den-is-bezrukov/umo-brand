import svgPaths from "@/imports/Umo8MaxPriceholder/svg-ll97xx0in3";
import imgRectangle1 from "@/imports/Umo8MaxPriceholder/05278b6b40a2933dab666c657dae0135ba82c32c.png";
import imgImage4 from "@/imports/Umo8MaxPriceholder/4463e47a6056ff4d3f0870fe15d8aed7a43ea000.png";

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

function Headline() {
  return (
    <div className="h-[920px] relative shrink-0 w-[2423px]">
      <div className="[word-break:break-word] absolute font-['Geist',sans-serif] font-medium leading-[0] left-0 text-[160px] text-black top-0 w-[2440px] whitespace-pre-wrap">
        <p className="leading-[1.15] mb-0">Гибридный кроссовер</p>
        <p>
          <span className="leading-[1.15]">{`с Алисой    `}</span>
          <span className="leading-[1.15] tracking-[-1.6px]">{` `}</span>
          <span className="leading-[1.15]">
            {` и сервисами Яндекса. Запас хода `}
            <br aria-hidden />
            до 867 км, разгон до 100 км/ч
            <br aria-hidden />
            {`за 6,7 секунды. `}
          </span>
        </p>
      </div>
      <div className="absolute h-[128px] left-[744px] top-[216px] w-[133px]">
        <div className="absolute inset-[-5.46%_-5.26%_-5.47%_-5.26%]">
          <svg className="block size-full" fill="none" height="141.992" preserveAspectRatio="none" viewBox="0 0 146.997 141.992" width="146.997">
            <path d={svgPaths.p126a7f00} stroke="black" strokeOpacity="0.9" strokeWidth="14" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Description() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col font-['Geist',sans-serif] font-medium gap-[38px] items-start relative shrink-0 text-black w-[2423px]">
      <p className="leading-[normal] opacity-60 relative shrink-0 text-[60px] w-full">Это комплектация MAX:</p>
      <div className="leading-[0] relative shrink-0 text-[100px] w-full">
        <p className="leading-[1.2] mb-0">Комфорт продуман до мелочей: массаж, панорамная крыша и вентиляция всех сидений.</p>
        <p className="leading-[1.2]">Сиденья с режимом нулевой гравитации — дорога больше не утомляет. Удаленное управление автомобилем через мобильное приложение из любой точки.</p>
      </div>
    </div>
  );
}

export default function Umo8Max({ fullPrice, creditPrice, qrSvg }: Props) {
  return (
    <div className="bg-white relative" style={{ width: 2970, height: 4200 }}>
      <Logo />

      {/* Right model number */}
      <div className="absolute bottom-[93.31%] right-[150px] top-[3.57%] w-[164px]">
        <svg className="absolute block inset-0 size-full" fill="none" height="131" preserveAspectRatio="none" viewBox="0 0 164 131" width="164">
          <path d={svgPaths.p32be8b80} fill="black" />
        </svg>
      </div>

      {/* Main text */}
      <div className="absolute content-stretch flex flex-col gap-[120px] items-start left-[165px] top-[484px] w-[2655px]">
        <Headline />
        <Description />
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
      <div className="absolute h-[488.593px] left-[2303px] top-[2687px] w-[517.03px]">
        {qrSvg
          ? <div className="absolute inset-0" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          : <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage4} />
        }
      </div>

      {/* Bottom background */}
      <div className="absolute h-[923px] left-0 top-[3277px] w-[2970px]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img alt="" className="absolute h-[126.57%] left-0 max-w-none top-[-22.89%] w-full" src={imgRectangle1} />
        </div>
      </div>

      {/* Disclaimer */}
      <div className="-translate-y-full [word-break:break-word] absolute flex flex-col font-['Geist',sans-serif] font-normal justify-end leading-[0] left-[150px] text-[30px] text-white top-[4106px] whitespace-nowrap">
        <p className="leading-[normal]">* Подробности уточняйте у менеджеров отдела продаж новых автомобилей. Не является публичной офертой</p>
      </div>
    </div>
  );
}
