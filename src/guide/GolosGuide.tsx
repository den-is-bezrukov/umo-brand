import type { CSSProperties } from 'react'
import Guide from './Guide'

// The brand guide set in Golos UMO (fonts/golos-umo), to judge the font in place of CoFo Sans.
// The guide's live text takes its family from --font-sans; pictures keep CoFo, outlined in them.
export default function GolosGuide() {
  return (
    <div style={{ '--font-sans': "'Golos UMO', sans-serif" } as CSSProperties}>
      <Guide />
    </div>
  )
}
