import type { BrandPriceCard } from '@/pricecard/card'
import umo8MaxPhoto from '@brand/assets/umo8-car.jpg'
import umo8UltraPhoto from '@brand/assets/umo8-ultra-car.jpg'
import umo5ProPhoto from '@brand/assets/umo5-car.jpg'
import umo5MaxPhoto from '@brand/assets/umo5-max-car.jpg'
// The screen's copies, 1600 px WebP: the preview never draws the photo wider; the PDF takes the full JPEGs
import umo8MaxPreview from '@brand/assets/umo8-car-preview.webp'
import umo8UltraPreview from '@brand/assets/umo8-ultra-car-preview.webp'
import umo5ProPreview from '@brand/assets/umo5-car-preview.webp'
import umo5MaxPreview from '@brand/assets/umo5-max-car-preview.webp'

// UMO's price card (`src/pricecard/card.ts` lays it out): each model's headline, wordmark and trims, their photos,
// prices, lists and fine print, as Figma «Price Cards» has them

// The photos are cut to the band and 3 mm (21.2 px) round it, at their own resolution (Figma's boxes are larger:
// UMO 8 Max (−30, −350) 2560×1440, Ultra (−200, −330) 2400×1200, UMO 5 (−30, −350) 2250×1181); the boxes are the cut's
// UMO 5 Max is cut 3 px lower than Pro, so its car, that much lower in the photo, stands where Pro's does
const UMO5_BOX = { x: -21.76, y: -21.52, w: 2143.43, h: 763 }
const UMO5_PX = { w: 3902, h: 1389 }

const DISCLAIMER = 'Настоящая информация носит исключительно ознакомительный характер, не является публичной офертой, определяемой положениями ст. 437 Гражданского кодекса РФ, и не влечет для Продавца каких-либо обязательств по заключению договора купли-продажи транспортного средства.'

/** UMO 8's credit terms, the same for both trims. Figma's texts word for word, its forced line breaks left out */
const TERMS = 'Параметры программы «UMO КРЕДИТ»: валюта кредита – рубли РФ; срок кредита от 12 до 96 мес.; сумма кредита - от 300 000 до 12 000 000 руб. Диапазон Полной стоимости кредита в % годовых составляет от 0,010% до 16,799% годовых. % ставка составляет от 0,01% до 16,30%, на диапазонах первоначального взноса от 10% до 90% включительно от стоимости автомобиля, при сроке кредита от 12 до 96 мес. и определяется индивидуально. Конечная ставка в пределах указанного диапазона зависит от выбранных условий: от выбранного автомобиля, срока кредитования, размера первоначального взноса, условий страхования и Вашей кредитной истории. ОЦЕНИВАЙТЕ СВОИ ФИНАНСОВЫЕ ВОЗМОЖНОСТИ И РИСКИ. ИЗУЧИТЕ ВСЕ УСЛОВИЯ КРЕДИТА.'
const BANK = 'Банк ООО «МБ РУС Банк», Лицензия № 3473 от 23.05.2024.'

/** The wordmark, 375×75, Figma's paths, each model's number after it */
const UMO = [
  'M170.626 27.1875H142.499V75H114.375V27.0896C114.375 7.84702 123.512 0 142.499 0H170.626V27.1875ZM226.873 0C245.854 0 255 7.83582 255 27.0896V75H226.873V27.1875H198.749V75H170.626V27.1875H198.749V0H226.873Z',
  'M76.875 47.8125H28.125V0H0V47.9105C0 67.1642 9.15654 75 28.1485 75H76.8487C95.8547 75 105 67.153 105 47.9105V0H76.875V47.8125Z',
  'M346.854 0C365.847 0 375 7.83582 375 27.0896V47.9105C375 67.153 365.858 75 346.854 75H292.524C273.528 75 264.375 67.1642 264.375 47.9105V27.0896C264.375 7.84702 273.528 0 292.524 0H346.854ZM292.5 47.8125H346.875V27.0896L292.5 27.1875V47.8125Z',
].join('')

/** Alice's mark on @, a thin no-break space, in Alice Okniks (`theme.css`) */
const ALICE = { font: 'fonts/AliceOkniks.woff', color: '#7a55ff' }

export const PRICE_CARD: BrandPriceCard = {
  /** The headline as Figma breaks it, a line a row; Alice's mark (and on UMO 5 the thin no-break space before it) in Alice Okniks, in Alice's violet */
  headlines: {
    umo8: [[{ text: 'Гибрид с\u00a0Алисой\u00a0' }, { text: '@', ...ALICE }], [{ text: 'и\u00a0технологиями\u00a0Яндекса' }]],
    umo5: [[{ text: 'Электромобиль' }], [{ text: 'с\u00a0технологиями Яндекса' }], [{ text: 'и\u00a0Алисой' }, { text: '\u00a0@', ...ALICE }]],
  },
  /** The wordmark with the model's number, 525×75 */
  lettering: {
    umo8: UMO + 'M509.87 0H446.375C436.641 0 431.25 3.60705 431.25 13.0777V23.2962C431.25 33.2156 438.587 34.1173 443.229 35.1687V36.9722C437.237 38.1731 431.25 42.6819 431.25 52.1525V61.0206C431.25 70.1878 436.939 75 447.874 75H508.376C519.307 75 525 70.192 525 61.0206V52.1525C525 42.6819 519.009 38.1731 513.021 36.9722V35.1687C517.663 34.1173 525 33.2156 525 23.2962V13.0777C525 3.60705 519.609 0 509.875 0H509.87ZM509.572 60.871H446.678V43.4384H509.572V60.871ZM509.572 30.2111H446.678V14.129H509.572V30.2111Z',
    umo5: UMO + 'M508.191 30.2086H454.062V14.1255H520.387C521.875 14.1255 522.767 13.3733 522.767 12.0227V2.10281C522.767 0.747954 522.023 0 520.687 0H440.238C439.198 0 438.75 0.752223 438.75 1.80363V30.9608C438.75 39.3763 443.063 43.4366 454.066 43.4366H509.684V60.8702H440.534C439.494 60.8702 438.75 61.4728 438.75 62.8234V73.1964C438.75 74.3974 439.346 75 440.534 75H508.492C519.346 75 525 68.6873 525 58.3143V48.544C525 35.316 520.687 30.2086 508.196 30.2086H508.191Z',
  },
  /** Per trim, the first a model's default; «от» and the monthly payment fixed, the full cost the dealer's to raise (the form) */
  trims: {
    umo5: [
      {
      id: 'pro', name: 'Про', from: '3 095 000', full: '3 095 000',
      photo: { print: umo5ProPhoto, preview: umo5ProPreview, box: UMO5_BOX, px: UMO5_PX },
      list: ['Запас хода до 420 км', 'Разгон до 100 км/ч за 8.7 c', 'Круиз контроль', 'Электрический привод багажника', 'Удаленный доступ со смартфона', 'Диски 17 дюймов'],
      legal: DISCLAIMER,
      },
      {
      id: 'max', name: 'Макс', from: '3 440 000', full: '3 440 000',
      photo: { print: umo5MaxPhoto, preview: umo5MaxPreview, box: UMO5_BOX, px: UMO5_PX },
      list: ['Запас хода до 420 км', 'Разгон до 100 км/ч за 8.7 c', 'Адаптивный круиз контроль', 'Система удержания в полосе', 'Адаптивное управление дальним светом', 'Интерактивная подсветка салона', 'Панорамная крыша', 'Диски 18 дюймов'],
      legal: DISCLAIMER,
      },
    ],
    umo8: [
      {
      id: 'max', name: 'Макс', from: '5 690 000', full: '5 690 000', monthly: '49 990',
      photo: { print: umo8MaxPhoto, preview: umo8MaxPreview, box: { x: -21.25, y: -21.87, w: 2143.13, h: 763.13 }, px: { w: 2286, h: 814 } },
      list: ['Разгон до 100 км/ч за 6.7 c', 'Суммарный запас хода до 867 км', 'Массаж и вентиляция всех сидений', 'Подогрев всех сидений', 'Режим нулевой гравитации', 'Удаленный доступ со смартфона', 'Панорамная крыша'],
      legal: `Предложение распространяется на автомобили UMO 8 MAX 2026 года выпуска. ${TERMS} Пример расчета ежемесячного платежа в размере 49 990 руб. для автомобиля UMO 8 MAX при следующих условиях: - розничная цена автомобиля – 5 690 000,00 руб. первоначальный взнос по кредиту – 3 965 865,84 руб., сумма кредита – 1 724 134,16 руб., срок кредитования – 36 мес., процентная ставка – 0,01% годовых. Полная стоимость кредита: от 0,010 до 16,799% годовых. ${DISCLAIMER} ${BANK}`,
      },
      {
      id: 'ultra', name: 'Ультра', from: '6 190 000', full: '6 190 000', monthly: '51 990',
      photo: { print: umo8UltraPhoto, preview: umo8UltraPreview, box: { x: -21.87, y: -21.41, w: 2143.75, h: 763.28 }, px: { w: 2744, h: 977 } },
      list: ['Разгон до 100 км/ч за 6.7 c', 'Суммарный запас хода до 867 км', 'Массаж и вентиляция всех сидений', 'Кожа наппа в салоне', 'Режим нулевой гравитации', 'Проекция на лобовое стекло', 'Панорамная крыша', 'ИИ фары с анимацией', 'Автопарковка'],
      legal: `Предложение распространяется на автомобили UMO 8 ULTRA 2026 года выпуска. ${TERMS} Пример расчета ежемесячного платежа в размере 51 990 руб. для автомобиля UMO 8 ULTRA при следующих условиях: розничная цена автомобиля – 6 190 000,00 руб., первоначальный взнос по кредиту – 4 318 648,00 руб. сумма кредита – 1 871 352,00 руб., срок кредитования – 36 мес., процентная ставка – 0,01% годовых. Полная стоимость кредита: от 0,010 до 16,799% годовых. ${DISCLAIMER} ${BANK}`,
      },
    ],
  },
}
