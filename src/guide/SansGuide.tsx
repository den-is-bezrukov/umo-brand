import type { CSSProperties } from 'react'
import Guide from './Guide'

// The brand guide set in UMO Sans (fonts/umo-sans), to judge the font in place of CoFo Sans.
// The guide's live text takes its family from --font-sans; pictures keep CoFo, outlined in them.
export default function SansGuide() {
  return (
    <div style={{ '--font-sans': "'UMO Sans', sans-serif" } as CSSProperties}>
      <Guide />
    </div>
  )
}
