import type { GuideChapter } from '@/brand'
import { Chapter, Fig, H2, Head, Section, Text, type Medium } from '@/guide/parts'
import { TEXT_LINK, SUPPORT_BOT } from '@/ui/links'

// Компостер's guide: its chapters and what they say, the first screen and the contacts. The page around them, the
// contents, Материалы and the editor are the core's (`src/guide/Guide.tsx`), the blocks they're written with too
// (`src/guide/parts.tsx`). A start: the logo only; the guide is to be at once the brand's, an explainer of the guide
// itself and of the product. The pictures from Figma «Composter».

/** The chapters in the contents, before Материалы and Контакты, which the core adds */
export const CHAPTERS: GuideChapter[] = [{ id: 'logo', title: 'Логотип' }]

export const OLD_ANCHORS: Record<string, string> = {}

/** The first screen: a still, no film (`video` empty) */
export const HERO = { video: '', small: '', poster: 'hero', still: 'hero', stillAlt: 'Пустая дорога до горизонта' }

/** The line under the first screen */
export const STATEMENT = 'Гайд и материалы бренда в одном месте'

/** Материалы' first sentence, before the list of what the generators make */
export const MATERIALS_LEAD = 'Готовый дизайн для дилеров Компостера:'

/** Материалы' first sentence lists the generators in this order */
export const INTRO_ORDER = ['/business-card', '/hours-sign']

/** Материалы' pictures drawn for the guide: none yet, each generator gets its own preview or a grey card */
export const DRAWN: Medium[] = []

/** Компостер's chapters */
export function Chapters() {
  return (
    <>
          {/* ── Логотип ── */}
          <Chapter id="logo" title="Логотип">
              <Section>
                <Fig name="logo" w={912} h={456} alt="Логотип Компостер" />
                <Head>
                  <H2>Логотип</H2>
                  <Text><p>Слово «Компостер», пробитое точками, как билет в компостере. Логотип не перерисовывают и не набирают шрифтом: берут готовый файл.</p></Text>
                </Head>
              </Section>
          </Chapter>
    </>
  )
}

/** Контакты' text */
export function Contact() {
  return (
                <Text wide>
                  <p>Если ответа нет в гайде или макет нужно согласовать, <a href={SUPPORT_BOT} target="_blank" rel="noopener" className={TEXT_LINK}>напишите нам</a>.</p>
                </Text>
  )
}

export const FOOTER = '© 2026 Компостер. Демо-бренд редактора'
