import page1 from '@/assets/memo/page-1.svg'
import page2 from '@/assets/memo/page-2.svg'
import { PAGE } from './memo'

// The memo's card in the guide's grid until a picture of its own is made: its two pages as the generator draws them,
// side by side on the grey, as tall as the price card's poster on a 444×333 card (64%), 72% of a wide 912×456 one.
// The pages (1,5 MB) load as the card comes near the screen
export default function MemoPreview({ wide }: { wide?: boolean }) {
  return (
    <div className={`flex items-center justify-center bg-[#f5f5f5] ${wide ? 'aspect-2/1 gap-[2%]' : 'aspect-4/3 gap-[3%]'}`}>
      {[page1, page2].map(src => (
        <img key={src} src={src} alt="" loading="lazy" draggable={false} className={`block bg-white ${wide ? 'w-[25.5%]' : 'w-[33.4%]'}`} style={{ aspectRatio: `${PAGE.w} / ${PAGE.h}` }} />
      ))}
    </div>
  )
}
