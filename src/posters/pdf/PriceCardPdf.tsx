import { Document, Page, View, Text, Image, Svg, Path } from '@react-pdf/renderer'
import svgUmo8 from '@/icons/umo8-badge'
import svgUmo5 from '@/icons/umo5-badge'
import QRCode from 'qrcode'
import QrVector from './QrVector'
import { cards, type Variant } from '../cardData'

const W = 841.89
const S = W / 1754
const px = (n: number) => n * S

/** No `creditPrice`: a card with no credit offer, one price under «Цена:» */
interface Props { variant: Variant; fullPrice: string; creditPrice?: string; qrUrl: string }

/** `large`: the headline's size on a line as tall as the type, for a card with one price */
function PriceBlock({ label, value, large }: { label: string; value: string; large?: boolean }) {
  const price = { fontFamily: 'CoFo Sans', fontWeight: 500, fontSize: px(large ? 96 : 72), lineHeight: large ? 1 : 1.25 }
  return (
    <View style={{ gap: px(15) }}>
      <Text style={{ fontFamily: 'CoFo Sans', fontWeight: 500, fontSize: px(40), lineHeight: 1.13, color: '#666' }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(large ? 24 : 18) }}>
        <Text style={price}>{value}</Text>
        <Text style={price}>₽</Text>
      </View>
    </View>
  )
}

/**
 * As in the preview (`singlePriceTop` in PriceCard.tsx): a lone price's figures stand on the QR code's bottom line.
 * react-pdf puts the baseline a full ascender (0.974 em) under the top of a line, where a browser's 1.0 line height
 * crops the ascender to 0.844 em — hence the difference from the preview's constant.
 */
function singlePriceTop(qrUrl: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modules = (QRCode as any).create(qrUrl, { errorCorrectionLevel: 'M' }).modules.size + 2
  const qrLine = 1570 + 250 - 250 / modules
  return qrLine - (40 * 1.13 + 15 + 96 * 0.974)
}

export default function PriceCardPdf({ variant, fullPrice, creditPrice, qrUrl }: Props) {
  const data = cards[variant]
  const svg = data.model === 'umo8' ? svgUmo8 : svgUmo5

  // Car image positioning
  const carW = data.model === 'umo8' ? 1760 : 1920
  const carH = data.model === 'umo8' ? 990 : 1080
  const carLeft = (W - px(carW)) / 2
  const carTop = data.model === 'umo8'
    ? (px(560) - px(carH)) / 2
    : px(560 + 95 - carH)  // bottom: -95px equivalent

  return (
    <Document>
      <Page size="A3" style={{ padding: 0, backgroundColor: 'white' }}>

        {/* Car image */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, width: W, height: px(560), overflow: 'hidden' }}>
          <Image src={data.image} style={{
            position: 'absolute',
            width: px(carW), height: px(carH),
            left: carLeft,
            top: carTop,
          }} />
        </View>

        {/* UMO logo */}
        <View style={{ position: 'absolute', left: px(100), top: px(100) }}>
          <Svg width={px(400)} height={px(80)} viewBox="0 0 400 80">
            <Path d={svg.p1d33e500} fill="black" />
            <Path d={svg.pe682d00} fill="black" />
            <Path d={svg.p10077300} fill="black" fillRule="evenodd" />
          </Svg>
        </View>

        {/* Model number */}
        {data.model === 'umo8' ? (
          <View style={{ position: 'absolute', left: px(540), top: px(100) }}>
            <Svg width={px(100)} height={px(80)} viewBox="0 0 100 80">
              <Path d={svgUmo8.p1b67d8f0} fill="black" />
            </Svg>
          </View>
        ) : (
          <View style={{ position: 'absolute', left: px(540), top: px(100) }}>
            <Svg width={px(92)} height={px(80)} viewBox="0 0 92 80">
              <Path d={svgUmo5.pac8b300} fill="black" />
            </Svg>
          </View>
        )}

        {/* Headline */}
        <View style={{ position: 'absolute', left: px(100), top: px(280), width: px(1554) }}>
          <Text style={{ fontFamily: 'CoFo Sans', fontWeight: 500, fontSize: px(96), lineHeight: 1.25, color: 'black' }}>
            {data.model === 'umo8' ? (
              <>
                <Text>{'Гибридный кроссовер\n'}</Text>
                <Text>{'с Алисо'}</Text>
                <Text style={{ letterSpacing: px(-9.6) }}>{'й'}</Text>
                <Text>{' '}</Text>
                <Text style={{ fontFamily: 'GeistY', color: '#7a55ff' }}>{'☺'}</Text>
                <Text>{'\xa0и\xa0сервисами Яндекса.\nЗапас хода до 867 км, разгон\nдо 100 км/ч за 6,7 секунды'}</Text>
              </>
            ) : (
              <>
                <Text>{'Технологичный электромобиль с Алисо'}</Text>
                <Text style={{ letterSpacing: px(-9.6) }}>{'й'}</Text>
                <Text>{' '}</Text>
                <Text style={{ fontFamily: 'GeistY', color: '#7a55ff' }}>{'☺'}</Text>
                <Text>{' и сервисами Яндекса. Запас хода до 420 км, разгон до 100 км/ч за 8,7 секунды'}</Text>
              </>
            )}
          </Text>
        </View>

        {/* Description */}
        <View style={{ position: 'absolute', left: px(100), top: px(835), width: px(1554), gap: px(30) }}>
          <Text style={{ fontFamily: 'CoFo Sans', fontWeight: 500, fontSize: px(40), lineHeight: 1.13, color: '#666' }}>
            {data.trimLabel}
          </Text>
          <Text style={{ fontFamily: 'CoFo Sans', fontWeight: 500, fontSize: px(60), lineHeight: 1.25, color: 'black' }}>
            {data.descriptionLines.join('\n')}
          </Text>
        </View>

        {/* Prices */}
        {creditPrice === undefined ? (
          <View style={{ position: 'absolute', left: px(100), top: px(singlePriceTop(qrUrl)) }}>
            <PriceBlock label={'Цена:'} value={fullPrice} large />
          </View>
        ) : (
          <View style={{ position: 'absolute', left: px(100), top: px(1505), gap: px(30) }}>
            <PriceBlock label={'Без кредита:'} value={fullPrice} />
            <PriceBlock label={'В кредит с субсидией:'} value={creditPrice} />
          </View>
        )}

        {/* QR code */}
        <View style={{ position: 'absolute', left: px(1404), top: px(1570) }}>
          <QrVector url={qrUrl} size={px(250)} />
        </View>

        {/* Disclaimer */}
        <Text style={{
          position: 'absolute', left: px(100), bottom: px(60),
          fontFamily: 'CoFo Sans', fontWeight: 400, fontSize: px(20), lineHeight: 1.1, color: 'rgba(255,255,255,0.6)',
        }}>
          {'* Подробности уточняйте у менеджеров отдела продаж новых автомобилей. Не является публичной офертой'}
        </Text>

      </Page>
    </Document>
  )
}
