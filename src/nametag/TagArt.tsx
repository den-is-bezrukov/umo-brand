import { TAG, LOGO } from './tag'

const INK = '#262626'

/**
 * The tag in the preview: a flat neutral grey plate standing in for the silver, the engraving dark. Drawn in the tag's
 * millimetres; `text` is the text outlines as path data, `color` the text's (red while it doesn't fit).
 */
export default function TagArt({ text, color = INK }: { text?: string; color?: string }) {
  const { w, h, r } = TAG
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full" role="img">
      <rect width={w} height={h} rx={r} fill="#dedede" />
      <path d={LOGO} fill={INK} />
      {text && <path d={text} fill={color} />}
    </svg>
  )
}
