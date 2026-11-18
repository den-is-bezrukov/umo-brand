import type { GuideChapter } from '@/brand'
import type { Medium } from '@/guide/parts'
export const CHAPTERS: GuideChapter[] = []
export const OLD_ANCHORS: Record<string, string> = {}
export const HERO = { video: '', small: '', poster: 'hero', still: 'hero', stillAlt: 'POSSET' }
export const STATEMENT = 'Гайд и материалы бренда в одном месте'
export const MATERIALS_LEAD = 'Материалы POSSET:'
export const INTRO_ORDER = ['/business-card', '/hours-sign', '/livery']
export const DRAWN: Medium[] = []
export function Chapters() { return null }
export function Contact() { return null }
export const FOOTER = '© 2026 POSSET'
