import { Document, Page, View, Text, Image, Svg, Path } from '@react-pdf/renderer'
import svgPaths from '@/imports/Umo5ProPriceCard/svg-kxo5ttp2xy'
import imgCar from '@/imports/Umo5ProPriceCard/9fcb9c444b55ba3b1cd91fa39d0c11dbdbbdbe24.png'
import QrVector from './QrVector'

const W = 841.89
const S = W / 1754
const px = (n: number) => n * S

const carLeft = (W - px(1760)) / 2
const carTop5 = px(560 - 990 + 100)

interface Props { fullPrice: string; creditPrice: string; qrUrl: string }

function PriceBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: px(15) }}>
      <Text style={{ fontFamily: 'Geist', fontWeight: 500, fontSize: px(36), lineHeight: 1.25, opacity: 0.6 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontFamily: 'Geist', fontWeight: 600, fontSize: px(72), lineHeight: 1.25 }}>{value}</Text>
        <Text style={{ fontFamily: 'Geist', fontWeight: 600, fontSize: px(72), lineHeight: 1.25 }}>{' ₽'}</Text>
      </View>
    </View>
  )
}

export default function Umo5ProPdf({ fullPrice, creditPrice, qrUrl }: Props) {
  return (
    <Document>
      <Page size="A3" style={{ padding: 0, backgroundColor: 'white' }}>

        {/* Car image */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, width: W, height: px(560), overflow: 'hidden' }}>
          <Image src={imgCar} style={{
            position: 'absolute',
            width: px(1760), height: px(990),
            left: carLeft,
            top: carTop5,
          }} />
        </View>

        {/* UMO logo */}
        <View style={{ position: 'absolute', left: px(100), top: px(100) }}>
          <Svg width={px(400)} height={px(80)} viewBox="0 0 400 80">
            <Path d={svgPaths.p1d33e500} fill="black" />
            <Path d={svgPaths.pe682d00} fill="black" />
            <Path d={svgPaths.p10077300} fill="black" fillRule="evenodd" />
          </Svg>
        </View>

        {/* Model "5" */}
        <View style={{ position: 'absolute', right: px(100), top: px(100) }}>
          <Svg width={px(92)} height={px(80)} viewBox="0 0 92 80">
            <Path d={svgPaths.pac8b300} fill="black" />
          </Svg>
        </View>

        {/* Headline */}
        <View style={{ position: 'absolute', left: px(100), top: px(280), width: px(1554) }}>
          <Text style={{ fontFamily: 'Geist', fontWeight: 500, fontSize: px(90), lineHeight: 1.33, color: 'black' }}>
            <Text>{'Технологичный электромобиль с Алисо'}</Text>
            <Text style={{ letterSpacing: px(-1.6) }}>{'й'}</Text>
            <Text>{' '}</Text>
            <Text style={{ fontFamily: 'GeistY' }}>{'☺'}</Text>
            <Text>{' и сервисами Яндекса. Запас хода до 420 км, разгон до 100 км/ч за 8,7 секунды'}</Text>
          </Text>
        </View>

        {/* Description */}
        <View style={{ position: 'absolute', left: px(100), top: px(835), width: px(1554), gap: px(30) }}>
          <Text style={{ fontFamily: 'Geist', fontWeight: 500, fontSize: px(36), lineHeight: 1.25, opacity: 0.6, color: 'black' }}>
            {'Это комплектация Про:'}
          </Text>
          <Text style={{ fontFamily: 'Geist', fontWeight: 500, fontSize: px(54), lineHeight: 1.38, color: 'black' }}>
            {'Всё нужное для комфортной городской жизни: электрический привод багажника с дистанционным управлением. За рулём помогает Алиса: проложит маршрут, включит любимую песню, чтобы вы могли сфокусироваться на дороге. Управляйте автомобилем из любой точки через приложение '}
            <Text>{'UMO.'}</Text>
          </Text>
        </View>

        {/* Prices */}
        <View style={{ position: 'absolute', left: px(100), top: px(1505), gap: px(30) }}>
          <PriceBlock label={'Полная цена:'} value={fullPrice} />
          <PriceBlock label={'В кредит с субсидией:'} value={creditPrice} />
        </View>

        {/* QR code — vector */}
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
