import { useEffect } from 'react'

// A generator's settings live in the page address, so a set-up card or livery can be sent as a link: the page reads
// them on load and writes them back as they change. Only what differs from the defaults goes in, so a link carries
// just the changes and stays short and readable.

/**
 * A value as it was meant, even from a link encoded twice: messengers (Telegram) may re-encode a pasted link, turning
 * a line break's %0A into %250A, which a single decoding leaves as the text «%0A». Escapes left after decoding are
 * decoded again, at most twice; a lone % in the text (10%) isn't an escape and stays.
 */
function decodeLeftovers(value: string): string {
  let v = value
  for (let i = 0; i < 2 && /%[0-9a-f]{2}/i.test(v); i++) {
    try {
      v = decodeURIComponent(v)
    } catch {
      break
    }
  }
  return v
}

/** The settings the page was opened with */
export function linkParams(): Pick<URLSearchParams, 'get' | 'has'> {
  const params = new URLSearchParams(window.location.search)
  return {
    get: (name: string) => {
      const v = params.get(name)
      return v === null ? null : decodeLeftovers(v)
    },
    has: (name: string) => params.has(name),
  }
}

/** Keeps the address in step with the settings; empty values are left out. Replaces the entry, so Back still leaves the page. */
export function useLinkState(params: Record<string, string | null | undefined>) {
  const query = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => e[1] !== null && e[1] !== undefined && e[1] !== ''),
  )
    .toString()
    // Allowed as they are in a query, and easier to read: link=https://umo.auto/&off=qr,rear
    .replace(/%3A/g, ':').replace(/%2F/g, '/').replace(/%2C/g, ',')
  useEffect(() => {
    const { pathname, search, hash } = window.location
    const next = `${pathname}${query ? `?${query}` : ''}${hash}`
    if (next !== pathname + search + hash) window.history.replaceState(window.history.state, '', next)
  }, [query])
}
