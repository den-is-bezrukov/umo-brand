import { Font } from '@react-pdf/renderer'

let registered = false

function localFont(name: string) {
  return new URL(`./fonts/${name}`, window.location.href).href
}

export function ensurePdfFonts() {
  if (registered) return
  registered = true

  Font.register({
    family: 'CoFo Sans',
    fonts: [
      { src: localFont('CoFoSans-Regular.ttf'), fontWeight: 400 },
      { src: localFont('CoFoSans-Medium.ttf'), fontWeight: 500 },
      { src: localFont('CoFoSans-Bold.ttf'), fontWeight: 700 },
      { src: localFont('CoFoSans-Black.ttf'), fontWeight: 900 },
    ],
  })

  Font.register({
    family: 'GeistY',
    src: localFont('Geist_Y-Medium.woff2'),
    fontWeight: 500,
  })

  Font.registerHyphenationCallback(word => [word])
}
