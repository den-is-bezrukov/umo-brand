import { Document, Page, View, Text, Image, Svg, Path } from '@react-pdf/renderer'
import svgUmo8 from '@/imports/Umo8MaxPriceCard/svg-nhd8qcz7hx'
import svgUmo5 from '@/imports/Umo5ProPriceCard/svg-kxo5ttp2xy'
import QrVector from './QrVector'
import { cards, type Variant } from '../cardData'

const W = 841.89
const S = W / 1754
const px = (n: number) => n * S

interface Props { variant: Variant; fullPrice: string; creditPrice: string; qrUrl: string }

function PriceBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: px(15) }}>
      <Text style={{ fontFamily: 'Geist', fontWeight: 500, fontSize: px(36), lineHeight: 1.25, opacity: 0.6 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(18) }}>
        <Text style={{ fontFamily: 'Geist', fontWeight: 600, fontSize: px(72), lineHeight: 1.25 }}>{value}</Text>
        <Text style={{ fontFamily: 'Geist', fontWeight: 600, fontSize: px(72), lineHeight: 1.25 }}>₽</Text>
      </View>
    </View>
  )
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
          <Text style={{ fontFamily: 'Geist', fontWeight: 500, fontSize: px(90), lineHeight: 1.33, color: 'black' }}>
            {data.model === 'umo8' ? (
              <>
                <Text>{'Гибридный кроссовер\n'}</Text>
                <Text>{'с Алисо'}</Text>
                <Text style={{ letterSpacing: px(-1.6) }}>{'й'}</Text>
                <Text>{' '}</Text>
                <Text style={{ fontFamily: 'GeistY', color: '#7a55ff' }}>{'☺'}</Text>
                <Text>{'\xa0и\xa0сервисами Яндекса.\nЗапас хода до 867 км, разгон\nдо 100 км/ч за 6,7 секунды'}</Text>
              </>
            ) : (
              <>
                <Text>{'Технологичный электромобиль с Алисо'}</Text>
                <Text style={{ letterSpacing: px(-1.6) }}>{'й'}</Text>
                <Text>{' '}</Text>
                <Text style={{ fontFamily: 'GeistY', color: '#7a55ff' }}>{'☺'}</Text>
                <Text>{' и сервисами Яндекса. Запас хода до 420 км, разгон до 100 км/ч за 8,7 секунды'}</Text>
              </>
            )}
          </Text>
        </View>

        {/* Description */}
        <View style={{ position: 'absolute', left: px(100), top: px(835), width: px(data.pdfDescWidth), gap: px(30) }}>
          <Text style={{ fontFamily: 'Geist', fontWeight: 500, fontSize: px(36), lineHeight: 1.25, opacity: 0.6, color: 'black' }}>
            {data.trimLabel}
          </Text>
          <Text style={{ fontFamily: 'Geist', fontWeight: 500, fontSize: px(54), lineHeight: 1.38, color: 'black' }}>
            {data.descriptionLines.join('\n')}
          </Text>
        </View>

        {/* Prices */}
        <View style={{ position: 'absolute', left: px(100), top: px(1505), gap: px(30) }}>
          <PriceBlock label={'Без кредита:'} value={fullPrice} />
          <PriceBlock label={'В кредит с субсидией:'} value={creditPrice} />
        </View>

        {/* QR code */}
        <View style={{ position: 'absolute', left: px(1404), top: px(1570) }}>
          <QrVector url={qrUrl} size={px(250)} />
        </View>

        {/* Disclaimer */}
        <Text style={{
          position: 'absolute', left: px(100), bottom: px(60),
          fontFamily: 'Geist', fontWeight: 400, fontSize: px(18), lineHeight: 1.1, color: 'white',
        }}>
          {'* Подробности уточняйте у менеджеров отдела продаж новых автомобилей. Не является публичной офертой'}
        </Text>

      </Page>
    </Document>
  )
}
