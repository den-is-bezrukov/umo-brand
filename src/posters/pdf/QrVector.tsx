import { Svg, Rect, Path } from '@react-pdf/renderer'
import QRCode from 'qrcode'

interface Props {
  url: string
  size: number
}

export default function QrVector({ url, size }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qr = (QRCode as any).create(url, { errorCorrectionLevel: 'M' })
  const count: number = qr.modules.size
  const margin = 1
  const total = count + margin * 2
  const cell = size / total

  // All dark modules as a single compound path — eliminates sub-pixel gaps between adjacent rects
  const parts: string[] = []
  for (let i = 0; i < count * count; i++) {
    if (!qr.modules.data[i]) continue
    const r = Math.floor(i / count)
    const c = i % count
    const x = (c + margin) * cell
    const y = (r + margin) * cell
    parts.push(`M${x} ${y}h${cell}v${cell}h${-cell}z`)
  }

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Rect x={0} y={0} width={size} height={size} fill="white" />
      <Path d={parts.join('')} fill="black" />
    </Svg>
  )
}
