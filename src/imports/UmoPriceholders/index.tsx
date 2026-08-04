import svgPaths from "./svg-iofy78c87q";
import imgImage from "./05278b6b40a2933dab666c657dae0135ba82c32c.png";

function Title() {
  return (
    <div className="col-[1/span_3] content-stretch flex items-start justify-self-stretch relative row-1 self-start shrink-0" data-name="Title">
      <p className="[word-break:break-word] flex-[1_0_0] font-['Geist:SemiBold',sans-serif] font-semibold leading-none min-w-px relative text-[24px] text-white">Прайсхолдер</p>
    </div>
  );
}

function Text() {
  return (
    <div className="relative shrink-0" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start py-[8px] relative size-full">
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[20px] relative shrink-0 text-[14px] text-white whitespace-nowrap">Модель</p>
      </div>
    </div>
  );
}

function SegmentButton() {
  return (
    <div className="bg-white flex-[1_0_0] min-w-[80px] relative" data-name="SegmentButton">
      <div className="flex flex-col items-center justify-center min-w-[inherit] size-full">
        <div className="content-stretch flex flex-col items-center justify-center min-w-[inherit] px-[24px] py-[8px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[20px] relative shrink-0 text-[14px] text-black text-center whitespace-nowrap">UMO 8</p>
        </div>
      </div>
    </div>
  );
}

function SegmentButton1() {
  return (
    <div className="bg-[#303033] flex-[1_0_0] min-w-[80px] relative" data-name="SegmentButton">
      <div className="flex flex-col items-center justify-center min-w-[inherit] size-full">
        <div className="content-stretch flex flex-col items-center justify-center min-w-[inherit] px-[24px] py-[8px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[20px] relative shrink-0 text-[14px] text-center text-white whitespace-nowrap">UMO 5</p>
        </div>
      </div>
    </div>
  );
}

function Frame1() {
  return (
    <div className="relative shrink-0 w-full">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center relative size-full">
        <SegmentButton />
        <SegmentButton1 />
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div className="col-1 content-stretch flex flex-col items-start justify-center justify-self-stretch min-w-[180px] relative row-2 self-stretch shrink-0" data-name="Container">
      <Text />
      <Frame1 />
    </div>
  );
}

function Text1() {
  return (
    <div className="relative shrink-0" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start py-[8px] relative size-full">
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[20px] relative shrink-0 text-[14px] text-white whitespace-nowrap">Комплектация</p>
      </div>
    </div>
  );
}

function SegmentButton2() {
  return (
    <div className="bg-[#303033] flex-[1_0_0] min-w-[80px] relative" data-name="SegmentButton">
      <div className="flex flex-col items-center justify-center min-w-[inherit] size-full">
        <div className="content-stretch flex flex-col items-center justify-center min-w-[inherit] px-[24px] py-[8px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[20px] relative shrink-0 text-[14px] text-center text-white whitespace-nowrap">MAX</p>
        </div>
      </div>
    </div>
  );
}

function SegmentButton3() {
  return (
    <div className="bg-white flex-[1_0_0] min-w-[80px] relative" data-name="SegmentButton">
      <div className="flex flex-col items-center justify-center min-w-[inherit] size-full">
        <div className="content-stretch flex flex-col items-center justify-center min-w-[inherit] px-[24px] py-[8px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[20px] relative shrink-0 text-[14px] text-black text-center whitespace-nowrap">ULTRA</p>
        </div>
      </div>
    </div>
  );
}

function Frame() {
  return (
    <div className="relative shrink-0 w-full">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <SegmentButton2 />
        <SegmentButton3 />
      </div>
    </div>
  );
}

function Container2() {
  return (
    <div className="col-2 content-stretch flex flex-col items-start justify-center justify-self-stretch min-w-[180px] relative row-2 self-stretch shrink-0" data-name="Container">
      <Text1 />
      <Frame />
    </div>
  );
}

function Label() {
  return (
    <div className="relative shrink-0" data-name="Label">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start py-[8px] relative size-full">
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[20px] relative shrink-0 text-[14px] text-white whitespace-nowrap">Ссылка QR:</p>
      </div>
    </div>
  );
}

function TextInput() {
  return (
    <div className="bg-[#303033] flex-[1_0_0] min-w-px mr-[-34px] relative" data-name="Text Input">
      <div className="flex flex-col justify-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-start justify-center pl-[12px] pr-[32px] py-[8px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[20px] relative shrink-0 text-[14px] text-white w-full">{`https://umo.auto/`}</p>
        </div>
      </div>
    </div>
  );
}

function Icon() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="14" preserveAspectRatio="none" viewBox="0 0 14 14" width="14">
        <g id="Icon">
          <path d={svgPaths.p3de7e600} id="Vector" stroke="#00C950" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.45833" />
        </g>
      </svg>
    </div>
  );
}

function Text2() {
  return (
    <div className="content-stretch flex flex-col items-start p-[10px] relative shrink-0" data-name="Text">
      <Icon />
    </div>
  );
}

function Container4() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center relative size-full">
        <TextInput />
        <Text2 />
      </div>
    </div>
  );
}

function Container3() {
  return (
    <div className="col-3 content-stretch flex flex-col items-start justify-center justify-self-stretch min-w-[180px] relative row-2 self-stretch shrink-0" data-name="Container">
      <Label />
      <Container4 />
    </div>
  );
}

function Label1() {
  return (
    <div className="relative shrink-0" data-name="Label">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start py-[8px] relative size-full">
        <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[20px] relative shrink-0 text-[14px] text-white whitespace-nowrap">Цена, ₽:</p>
      </div>
    </div>
  );
}

function TextInput1() {
  return (
    <div className="bg-[#303033] relative shrink-0 w-full" data-name="Text Input">
      <div className="flex flex-col justify-center size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-center px-[12px] py-[8px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[20px] relative shrink-0 text-[14px] text-white w-full">6 515 000</p>
        </div>
      </div>
    </div>
  );
}

function Container5() {
  return (
    <div className="col-1 content-stretch flex flex-col items-start justify-center justify-self-stretch min-w-[180px] relative row-3 self-stretch shrink-0" data-name="Container">
      <Label1 />
      <TextInput1 />
    </div>
  );
}

function Label2() {
  return (
    <div className="content-stretch flex flex-col items-start py-[8px] relative shrink-0" data-name="Label">
      <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[20px] relative shrink-0 text-[14px] text-white whitespace-nowrap">В кредит, ₽:</p>
    </div>
  );
}

function TextInput2() {
  return (
    <div className="bg-[#303033] relative shrink-0 w-full" data-name="Text Input">
      <div className="flex flex-col justify-center size-full">
        <div className="content-stretch flex flex-col items-start justify-center px-[12px] py-[8px] relative size-full">
          <p className="[word-break:break-word] font-['Geist:Regular',sans-serif] font-normal leading-[20px] relative shrink-0 text-[14px] text-white w-full">5 000 000</p>
        </div>
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="col-2 content-stretch flex flex-col items-start justify-center justify-self-stretch min-w-[180px] relative row-3 self-stretch shrink-0" data-name="Container">
      <Label2 />
      <TextInput2 />
    </div>
  );
}

function Icon1() {
  return (
    <div className="relative shrink-0 size-[15px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="15" preserveAspectRatio="none" viewBox="0 0 15 15" width="15">
        <g id="Icon">
          <path d={svgPaths.p3c0592d0} id="Vector" stroke="black" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
          <path d={svgPaths.p581d980} id="Vector_2" stroke="black" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
          <path d="M7.5 9.375V1.875" id="Vector_3" stroke="black" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
        </g>
      </svg>
    </div>
  );
}

function Button() {
  return (
    <div className="bg-white relative shrink-0 w-full" data-name="Button">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex gap-[8px] items-center justify-center px-[20px] py-[8px] relative size-full">
          <Icon1 />
          <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[20px] relative shrink-0 text-[14px] text-black text-center whitespace-nowrap">Скачать PDF</p>
        </div>
      </div>
    </div>
  );
}

function Frame2() {
  return (
    <div className="col-3 justify-self-stretch min-w-[180px] relative row-3 self-stretch shrink-0">
      <div className="flex flex-col justify-end min-w-[inherit] size-full">
        <div className="content-stretch flex flex-col items-start justify-end min-w-[inherit] pt-[12px] relative size-full">
          <Button />
        </div>
      </div>
    </div>
  );
}

function Container() {
  return (
    <div className="relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid gap-x-[24px] gap-y-[12px] grid grid-cols-[repeat(3,minmax(0,1fr))] grid-rows-[repeat(3,fit-content(100%))] p-[24px] relative size-full">
        <Title />
        <Container1 />
        <Container2 />
        <Container3 />
        <Container5 />
        <Container6 />
        <Frame2 />
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="bg-black shrink-0 sticky top-0 w-[870px]" data-name="App">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <Container />
      </div>
    </div>
  );
}

function Icon2() {
  return (
    <div className="absolute h-[36.311px] left-0 overflow-clip top-[-0.03px] w-[181.56px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="36.3106" preserveAspectRatio="none" viewBox="0 0 181.56 36.3106" width="181.56">
        <g id="Group">
          <path d={svgPaths.p1f4f66c0} fill="white" id="Vector" />
          <path d={svgPaths.p25267600} fill="black" id="Vector_2" />
          <path d={svgPaths.p34c43900} fill="black" id="Vector_3" />
          <path clipRule="evenodd" d={svgPaths.p3aaefcf0} fill="black" fillRule="evenodd" id="Vector_4" />
        </g>
      </svg>
    </div>
  );
}

function Logo() {
  return (
    <div className="absolute h-[36.257px] left-[41.52px] top-[41.54px] w-[181.56px]" data-name="Logo">
      <Icon2 />
    </div>
  );
}

function Icon3() {
  return (
    <div className="absolute h-[36.27px] left-0 top-[-0.01px] w-[45.39px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="36.2696" preserveAspectRatio="none" viewBox="0 0 45.39 36.2696" width="45.39">
        <g clipPath="url(#clip0_0_6)" id="Icon">
          <path d={svgPaths.p23d2b2c0} fill="black" id="Vector" />
        </g>
        <defs>
          <clipPath id="clip0_0_6">
            <rect fill="white" height="36.2696" width="45.39" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Container9() {
  return (
    <div className="absolute h-[36.257px] left-[735.1px] top-[41.51px] w-[45.39px]" data-name="Container">
      <Icon3 />
    </div>
  );
}

function Paragraph() {
  return (
    <div className="relative shrink-0 w-full" data-name="Paragraph">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[50.925px] relative shrink-0 text-[44.283px] text-black whitespace-nowrap">Гибридный кроссовер</p>
      </div>
    </div>
  );
}

function Paragraph1() {
  return (
    <div className="relative shrink-0 w-full" data-name="Paragraph">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <div className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[0] relative shrink-0 text-[44.283px] text-black w-[675.314px] whitespace-pre-wrap">
          <p className="mb-0">
            <span className="leading-[50.925px]">{`с Алисой    `}</span>
            <span className="leading-[50.925px] tracking-[-0.4428px]">{` `}</span>
            <span className="leading-[50.925px]">{` и сервисами Яндекса. Запас хода `}</span>
          </p>
          <p className="leading-[50.925px] mb-0">до 867 км, разгон до 100 км/ч</p>
          <p className="leading-[50.925px]">{`за 6,7 секунды. `}</p>
        </div>
      </div>
    </div>
  );
}

function Container11() {
  return (
    <div className="absolute content-stretch flex flex-col h-[267.911px] items-start left-0 top-0 w-[675.314px]" data-name="Container">
      <Paragraph />
      <Paragraph1 />
    </div>
  );
}

function Icon4() {
  return (
    <div className="h-[39.297px] relative shrink-0 w-[40.68px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="39.2966" preserveAspectRatio="none" viewBox="0 0 40.6805 39.2966" width="40.6805">
        <g clipPath="url(#clip0_0_4)" id="Icon">
          <path d={svgPaths.pe20dc80} id="Vector" stroke="black" strokeOpacity="0.9" strokeWidth="3.87447" />
        </g>
        <defs>
          <clipPath id="clip0_0_4">
            <rect fill="white" height="39.2966" width="40.6805" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Container12() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-[203.98px] top-[57.85px]" data-name="Container">
      <Icon4 />
    </div>
  );
}

function Headline() {
  return (
    <div className="h-[267.911px] relative shrink-0 w-[670.609px]" data-name="Headline">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Container11 />
        <Container12 />
      </div>
    </div>
  );
}

function Paragraph2() {
  return (
    <div className="opacity-60 relative shrink-0 w-[734.819px]" data-name="Paragraph">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[16.606px] text-black whitespace-nowrap">Это комплектация ULTRA:</p>
      </div>
    </div>
  );
}

function Paragraph3() {
  return (
    <div className="relative shrink-0 w-[734.819px]" data-name="Paragraph">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <div className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[0] relative shrink-0 text-[27.677px] text-black w-[740.908px] whitespace-pre-wrap">
          <p className="leading-[33.212px] mb-0">{`Комфорт продуман до мелочей: массаж, панорамная крыша и вентиляция всех сидений. Сиденья `}</p>
          <p className="leading-[33.212px] mb-0">{`с режимом нулевой гравитации — дорога больше `}</p>
          <p className="leading-[33.212px] mb-0">{`не утомляет. Проекция на лобовом стекле, салон `}</p>
          <p className="leading-[33.212px]">в коже Nappa с замшевым потолком, объёмный звук 22 динамиков. Машина сама умеет парковаться, а ИИ фары элегантно подчеркивают статус автомобиля</p>
        </div>
      </div>
    </div>
  );
}

function Description() {
  return (
    <div className="relative shrink-0 w-[734.819px]" data-name="Description">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[10.517px] items-start relative size-full">
        <Paragraph2 />
        <Paragraph3 />
      </div>
    </div>
  );
}

function Container10() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[33.212px] items-start left-[45.67px] top-[133.96px] w-[734.819px]" data-name="Container">
      <Headline />
      <Description />
    </div>
  );
}

function Paragraph4() {
  return (
    <div className="opacity-60 relative shrink-0 w-[198.996px]" data-name="Paragraph">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[16.606px] text-black whitespace-nowrap">Полная цена:</p>
      </div>
    </div>
  );
}

function Container16() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[34.489px] text-black whitespace-nowrap">6 515 000</p>
      </div>
    </div>
  );
}

function Container17() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[34.489px] text-black whitespace-nowrap">₽</p>
      </div>
    </div>
  );
}

function Container15() {
  return (
    <div className="relative shrink-0 w-[198.996px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[2.768px] items-center relative size-full">
        <Container16 />
        <Container17 />
      </div>
    </div>
  );
}

function Container14() {
  return (
    <div className="relative shrink-0 w-[198.996px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[6.366px] items-start relative size-full">
        <Paragraph4 />
        <Container15 />
      </div>
    </div>
  );
}

function Paragraph5() {
  return (
    <div className="opacity-60 relative shrink-0 w-[207.853px]" data-name="Paragraph">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <p className="[word-break:break-word] font-['Geist:Medium',sans-serif] font-medium leading-[normal] relative shrink-0 text-[16.606px] text-black whitespace-nowrap">В кредит с субсидией:</p>
      </div>
    </div>
  );
}

function Container20() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[34.489px] text-black whitespace-nowrap">5 000 000</p>
      </div>
    </div>
  );
}

function Container21() {
  return (
    <div className="relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start relative size-full">
        <p className="[word-break:break-word] font-['Geist:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[34.489px] text-black whitespace-nowrap">₽</p>
      </div>
    </div>
  );
}

function Container19() {
  return (
    <div className="relative shrink-0 w-[207.853px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[2.768px] items-center relative size-full">
        <Container20 />
        <Container21 />
      </div>
    </div>
  );
}

function Container18() {
  return (
    <div className="relative shrink-0 w-[207.853px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[6.366px] items-start relative size-full">
        <Paragraph5 />
        <Container19 />
      </div>
    </div>
  );
}

function Container13() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[19.374px] items-start left-[45.67px] top-[721.81px] w-[207.853px]" data-name="Container">
      <Container14 />
      <Container18 />
    </div>
  );
}

function Icon5() {
  return (
    <div className="h-[135.34px] relative shrink-0 w-[143.089px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="135.34" preserveAspectRatio="none" viewBox="0 0 143.089 135.34" width="143.089">
        <g clipPath="url(#clip0_0_8)" id="Icon">
          <path d={svgPaths.p14816200} fill="white" id="Vector" />
          <g id="Vector_2">
            <path d={svgPaths.p3587b600} fill="black" />
            <path d={svgPaths.pcdc8280} stroke="black" strokeWidth="5.01258" />
          </g>
        </g>
        <defs>
          <clipPath id="clip0_0_8">
            <rect fill="white" height="135.34" width="143.089" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Container22() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-[637.4px] top-[751.42px]" data-name="Container">
      <Icon5 />
    </div>
  );
}

function Image() {
  return (
    <div className="absolute h-[323.265px] left-0 top-[-58.44px] w-[822.001px]" data-name="Image">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage} />
    </div>
  );
}

function Container23() {
  return (
    <div className="absolute h-[255.457px] left-0 overflow-clip top-[906.97px] w-[822.001px]" data-name="Container">
      <Image />
    </div>
  );
}

function Container8() {
  return (
    <div className="absolute bg-white h-[1162.426px] left-0 top-0 w-[822.001px]" data-name="Container">
      <Logo />
      <Container9 />
      <Container10 />
      <Container13 />
      <Container22 />
      <Container23 />
      <p className="[word-break:break-word] absolute font-['Geist:Regular',sans-serif] font-normal leading-[normal] left-[41.49px] text-[8.303px] text-white top-[1125.61px] whitespace-nowrap">* Подробности уточняйте у менеджеров отдела продаж новых автомобилей. Не является публичной офертой</p>
    </div>
  );
}

function Container7() {
  return (
    <div className="h-[1162.422px] relative shrink-0 w-[822px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Container8 />
      </div>
    </div>
  );
}

function App1() {
  return (
    <div className="relative shrink-0 w-full" data-name="App">
      <div className="flex flex-row justify-center size-full">
        <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start justify-center p-[24px] relative size-full">
          <Container7 />
        </div>
      </div>
    </div>
  );
}

export default function UmoPriceholders() {
  return (
    <div className="bg-black content-stretch flex flex-col items-start relative size-full" data-name="UMO Priceholders">
      <App />
      <App1 />
    </div>
  );
}