import { TAG, LOGO } from './tag'

const INK = '#262626'

/**
 * The tag in the preview: a flat white plate, the engraving dark. Drawn in the tag's millimetres; `text` is the text
 * outlines as path data, `alert` those of the fields at fault (red), `ghost` the placeholders of empty fields, grey.
 */
export default function TagArt({ text, alert, ghost }: { text?: string; alert?: string; ghost?: string }) {
  const { w, h, r } = TAG
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full" role="img">
      <rect width={w} height={h} rx={r} fill="#ffffff" />
      <path d={LOGO} fill={INK} />
      {ghost && <path d={ghost} fill="#a6a6a6" />}
      {text && <path d={text} fill={INK} />}
      {alert && <path d={alert} fill="#e30" />}
    </svg>
  )
}
