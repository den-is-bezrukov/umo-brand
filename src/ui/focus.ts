import { useEffect, type RefObject } from 'react'

/**
 * Keep the whole focused field above the sticky download on desktop, for a theme that sets `--sidebar-keep-focus: 1` on
 * the sidebar. The phone sheet handles its own keyboard.
 */
export default function useSidebarFocus(header: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const sidebar = header.current?.closest<HTMLElement>('[data-ui="sidebar"]')
    if (!sidebar) return
    let frame = 0
    let watched: HTMLElement | null = null
    const schedule = () => {
      cancelAnimationFrame(frame)
      // Focus styles and React's textarea sizing must settle before measuring the expanded block.
      frame = requestAnimationFrame(reveal)
    }
    const observer = new ResizeObserver(schedule)
    const reveal = () => {
      if (getComputedStyle(sidebar).getPropertyValue('--sidebar-keep-focus').trim() !== '1') return
      const input = document.activeElement
      if (!(input instanceof HTMLElement) || !sidebar.contains(input) || input.closest('[data-ui="download"]')) return
      const field = input.closest<HTMLElement>('[data-ui="field"]')
      if (!field) return
      if (watched !== field) {
        if (watched) observer.unobserve(watched)
        observer.observe(field)
        watched = field
      }
      const box = sidebar.getBoundingClientRect()
      const footer = sidebar.querySelector<HTMLElement>('[data-ui="download"]')?.getBoundingClientRect()
      const top = Math.max(box.top, 0) + 12
      const bottom = Math.min(box.bottom, window.innerHeight, footer?.top ?? Infinity) - 12
      if (bottom <= top) return
      const whole = field.getBoundingClientRect()
      // A multiline block taller than the available space must still expose its input.
      const target = whole.height <= bottom - top ? whole : input.getBoundingClientRect()
      const delta = target.bottom > bottom ? target.bottom - bottom : target.top < top ? target.top - top : 0
      if (Math.abs(delta) > 1) sidebar.scrollTop += delta
    }
    sidebar.addEventListener('focusin', schedule)
    sidebar.addEventListener('input', schedule)
    window.addEventListener('resize', schedule)
    observer.observe(sidebar)
    const footer = sidebar.querySelector<HTMLElement>('[data-ui="download"]')
    if (footer) observer.observe(footer)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      sidebar.removeEventListener('focusin', schedule)
      sidebar.removeEventListener('input', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [header])
}
