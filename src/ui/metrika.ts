// Yandex.Metrika (the brand's counter, `SITE.metrika`, is in index.html, loaded on its domain only, so elsewhere these do nothing).
import { SITE } from '@/site'
// Goals are JavaScript events set up in Metrika by these ids. Parameters say what was made, never what was typed:
// the generators hold staff names, phones and emails.
export const COUNTER = SITE.metrika

export type Goal =
  | 'download_price_card'
  | 'download_livery'
  | 'download_plate_frame'
  | 'download_name_tag'
  | 'download_owner_memo'
  | 'download_owner_memo_template'
  | 'download_business_card_template'
  | 'download_price_card_template'
  | 'download_price_tag_template'
  | 'download_hours_sign_template'
  | 'download_name_tag_template'
  | 'download_plate_frame_template'
  | 'download_livery_template'
  | 'download_business_card'
  | 'download_price_tag'
  | 'download_hours_sign'
  | 'copy_link'
  | 'open_menu'
  | 'open_help'
  | 'dealer_link'

export function goal(id: Goal, params?: Record<string, string | number | boolean>) {
  ;(window as any).ym?.(COUNTER, 'reachGoal', id, params)
}
