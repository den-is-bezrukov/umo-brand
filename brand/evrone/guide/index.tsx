import type { GuideChapter } from '@/brand'
import { Caption, Chapter, LogoPlate, Section, Swatch, Text, type Medium } from '@/guide/parts'
import { TEXT_LINK, SUPPORT_BOT } from '@/ui/links'
import { COLORS } from '@brand/colors'

// Evrone's guide: its chapters, the first screen and the contacts. The page around them, the contents, Материалы and
// the editor are the core's (`src/guide/Guide.tsx`), the blocks they're written with too (`src/guide/parts.tsx`).

/** The chapters in the contents, before Материалы and Контакты, which the core adds */
export const CHAPTERS: GuideChapter[] = [
  { id: 'logo', title: 'Логотип' },
  { id: 'color', title: 'Цвет' },
  { id: 'typography', title: 'Типографика' },
]

export const OLD_ANCHORS: Record<string, string> = {}

/** The first screen: a still, no film (`video` empty) */
export const HERO = { video: '', small: '', poster: 'hero', still: 'hero', stillAlt: '' }

/** The line under the first screen */
export const STATEMENT = 'Превращаем идеи в цифровые продукты'

/** Материалы' first sentence, before the list of what the generators make */
export const MATERIALS_LEAD = 'Готовый дизайн для офиса и встреч Evrone:'

/** Материалы' first sentence lists the generators in this order */
export const INTRO_ORDER = ['/business-card', '/hours-sign', '/plate-frame']

/** Материалы' pictures drawn for the guide: none yet, each generator gets its own preview or a grey card */
export const DRAWN: Medium[] = []

/** Evrone's chapters */
export function Chapters() {
  return (
    <>
          <Chapter id="logo" title="Логотип">
            <Section>
              <Text><p>Логотип Evrone — словесный знак, набранный строчными. Чёрный на светлом фоне, белый на тёмном и на оранжевом.</p></Text>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <LogoPlate w={444} h={333} logo={240} bg="#f5f5f5" />
                <LogoPlate w={444} h={333} logo={240} bg="#ff4400" dark />
              </div>
            </Section>
          </Chapter>

          <Chapter id="color" title="Цвет">
            <Section>
              <Text><p>Чёрный и оранжевый — основные цвета Evrone, белый и песочный — фон.</p></Text>
              <div className="grid grid-cols-2 gap-4 md:gap-6">
                {[...COLORS.main, ...COLORS.service].map(c => <Swatch key={c.name} {...c} className="aspect-4/3 max-sm:p-4" />)}
              </div>
            </Section>
          </Chapter>

          <Chapter id="typography" title="Типографика">
            <Section>
              <Text><p>Гарнитура Suisse Int'l в одном начертании, Book, — для заголовков и для текста.</p></Text>
              <figure className="flex flex-col gap-3">
                <div className="flex aspect-4/3 min-[520px]:aspect-2/1 items-center justify-center bg-surface">
                  <p className="text-[48px] sm:text-[72px] md:text-[96px] leading-none tracking-[-0.01em]">Suisse Int'l</p>
                </div>
                <Caption>Базовая гарнитура</Caption>
              </figure>
            </Section>
          </Chapter>
    </>
  )
}

/** Контакты' text */
export function Contact() {
  return (
                <Text wide>
                  <p>Если ответа нет в стандартах, <a href={SUPPORT_BOT} target="_blank" rel="noopener" className={TEXT_LINK}>напишите нам</a>.</p>
                </Text>
  )
}

export const FOOTER = '© 2026 Evrone. Стандарты бренда Evrone'
