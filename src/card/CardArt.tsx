import { CARD } from './card'

const INK = '#000000'

/**
 * A side of the card in the preview, in its millimetres: a white card, `text` in black (`dark`: a black card, `text`
 * white), `alert` (the fields at fault) red, `ghost` (placeholders of empty fields) grey. Every path is even-odd, as in
 * the PDF
 */
export default function CardArt({ text, alert, ghost, dark }: { text?: string; alert?: string; ghost?: string; dark?: boolean }) {
  return (
    <svg viewBox={`0 0 ${CARD.w} ${CARD.h}`} className="block w-full" role="img">
      <rect width={CARD.w} height={CARD.h} fill={dark ? INK : '#ffffff'} />
      {ghost && <path d={ghost} fill="#a6a6a6" fillRule="evenodd" />}
      {text && <path d={text} fill={dark ? '#ffffff' : INK} fillRule="evenodd" />}
      {alert && <path d={alert} fill="#e30" fillRule="evenodd" />}
    </svg>
  )
}
