/** A link inside body copy (the guide's) keeps its line at 40% so it reads as a link, and it turns black under the pointer */
import { SITE } from '@/site'
export const TEXT_LINK = 'underline decoration-black/40 decoration-[2.5%] underline-offset-[25%] [text-decoration-skip-ink:none] transition-[text-decoration-color] duration-250 ease-[ease] hover:decoration-black hover:duration-0'

/** The brand's support (`SITE.support`): the guide's «Контакты» and the generators' «Инструкция» send people there */
export const SUPPORT_BOT = SITE.support
