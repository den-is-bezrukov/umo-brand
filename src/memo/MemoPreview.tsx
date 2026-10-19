import page1 from '@/assets/memo/page-1.svg'
import page2 from '@/assets/memo/page-2.svg'
import { PAGE } from './memo'

// The memo's card in the guide's grid until a picture of its own is made: its two pages as the generator draws them,
// side by side on the 444×333 grey, as tall as the price card's poster there. The pages (1,5 MB) load as the card
// comes near the screen
export default function MemoPreview() {
  return (
    <div className="flex aspect-4/3 items-center justify-center gap-[3%] bg-[#f5f5f5]">
      {[page1, page2].map(src => (
        <img key={src} src={src} alt="" loading="lazy" draggable={false} className="block w-[33.4%] bg-white" style={{ aspectRatio: `${PAGE.w} / ${PAGE.h}` }} />
      ))}
    </div>
  )
}
