import { Font } from '@react-pdf/renderer'

let registered = false

function localFont(name: string) {
  return new URL(`/fonts/${name}`, window.location.href).href
}

export function ensurePdfFonts() {
  if (registered) return
  registered = true

  Font.register({
    family: 'Geist',
    fonts: [
      { src: localFont('Geist-Regular.ttf'), fontWeight: 400 },
      { src: localFont('Geist-Medium.ttf'), fontWeight: 500 },
      { src: localFont('Geist-SemiBold.ttf'), fontWeight: 600 },
    ],
  })

  Font.register({
    family: 'GeistY',
    src: localFont('Geist_Y-Medium.woff2'),
    fontWeight: 500,
  })

  Font.registerHyphenationCallback(word => [word])
}
