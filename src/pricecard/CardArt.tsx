import { useId } from 'react'
import { toD } from '@/livery/geometry'
import { BAND, CARD, photoRect, type Art } from './card'

/** The card in the preview, in its px: the photo's screen copy cut to the band, the outlines over it, as in the PDF */
export default function CardArt({ art }: { art: Art }) {
  const clip = useId()
  const r = photoRect(art.photo)
  return (
    <svg viewBox={`0 0 ${CARD.w} ${CARD.h}`} className="block size-full" role="img">
      <rect width={CARD.w} height={CARD.h} fill="#ffffff" />
      <clipPath id={clip}><rect width={CARD.w} height={BAND} /></clipPath>
      <image href={art.photo.preview} x={r.x} y={r.y} width={r.w} height={r.h} preserveAspectRatio="none" clipPath={`url(#${clip})`} />
      {Object.entries(art.parts).map(([ink, cmds]) => cmds.length > 0 && (
        <path key={ink} d={toD(cmds)} fill={ink} fillRule="evenodd" />
      ))}
    </svg>
  )
}
