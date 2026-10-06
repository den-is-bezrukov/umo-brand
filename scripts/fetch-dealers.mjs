// Collects UMO dealers from the umo.auto booking pages into src/data/dealers.json.
// The booking page carries the dealers of one city in its data; the city lives in
// the booking draft and is switched by the page's updateFormValues server action,
// so the script opens a draft per model, switches it through every city and reads
// the dealers back. Run it by hand (node scripts/fetch-dealers.mjs) and review the
// changes with git diff.

import { writeFileSync } from "node:fs"

const SITE = "https://umo.auto"
const MODELS = ["umo8", "umo5"]
const OUT = new URL("../src/data/dealers.json", import.meta.url)

const cookies = new Map()

async function request(url, init = {}) {
  for (let hops = 0; hops < 10; hops++) {
    const res = await fetch(url, {
      ...init,
      redirect: "manual",
      headers: {
        "User-Agent": "Mozilla/5.0",
        Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
        ...init.headers,
      },
    })
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";")
      const i = pair.indexOf("=")
      cookies.set(pair.slice(0, i), pair.slice(i + 1))
    }
    const location = res.headers.get("location")
    if (res.status >= 300 && res.status < 400 && location) {
      url = new URL(location, url).href
      init = { headers: init.headers }
      continue
    }
    if (!res.ok) throw new Error(`${res.status} ${url}`)
    return { url, text: await res.text() }
  }
  throw new Error(`Too many redirects: ${url}`)
}

// The page data is streamed as JS string chunks: self.__next_f.push([1,"..."])
function pageData(html) {
  let data = ""
  for (const m of html.matchAll(
    /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g,
  ))
    data += JSON.parse(m[1])
  return data
}

// The JSON array or object starting at data[start], bracket-matched.
function jsonAt(data, start) {
  let depth = 0
  let inString = false
  for (let i = start; i < data.length; i++) {
    const ch = data[i]
    if (inString) {
      if (ch === "\\") i++
      else if (ch === '"') inString = false
    } else if (ch === '"') inString = true
    else if (ch === "[" || ch === "{") depth++
    else if (ch === "]" || ch === "}") {
      if (--depth === 0) return JSON.parse(data.slice(start, i + 1))
    }
  }
  throw new Error("Unbalanced JSON")
}

function field(data, key) {
  const i = data.indexOf(`"${key}":`)
  if (i < 0) throw new Error(`No ${key} in the page`)
  return jsonAt(data, i + key.length + 3)
}

async function actionId(html) {
  const chunks = [
    ...new Set(html.match(/\/s3\/assets\/_next\/static\/chunks\/[^"\\]+\.js/g)),
  ]
  for (const chunk of chunks) {
    const { text } = await request(SITE + chunk)
    const m = text.match(
      /createServerReference\)\("([0-9a-f]+)",[^)]*?"updateFormValues"\)/,
    )
    if (m) return m[1]
  }
  throw new Error("updateFormValues action not found")
}

const dealers = new Map()

for (const model of MODELS) {
  const page = await request(`${SITE}/${model}/booking`)
  const draftId = new URL(page.url).searchParams.get("draft_id")
  if (!draftId) throw new Error(`No draft for ${model}`)
  const action = await actionId(page.text)
  const { cities } = field(pageData(page.text), "citiesInfo")

  for (const city of cities) {
    await request(page.url, {
      method: "POST",
      headers: {
        "Next-Action": action,
        "Content-Type": "text/plain;charset=UTF-8",
        Accept: "text/x-component",
      },
      body: JSON.stringify([draftId, { cityId: city.id }]),
    })
    const data = pageData((await request(page.url)).text)
    const shown = field(data, "defaultValues").cityId
    if (shown !== city.id)
      throw new Error(`${model}: asked for ${city.name}, got city ${shown}`)
    const list = field(data, "dealers")
    console.log(model, city.name, list.length)
    for (const d of list) {
      const known = dealers.get(d.id)
      if (known) {
        if (!known.models.includes(model)) known.models.push(model)
        continue
      }
      dealers.set(d.id, {
        id: d.id,
        name: d.name,
        city: city.name,
        address: d.address.shortText,
        coordinates: d.address.coordinates,
        hours: d.workingHours,
        models: [model],
      })
    }
  }
}

const sorted = [...dealers.values()].sort(
  (a, b) =>
    a.city.localeCompare(b.city, "ru") || a.name.localeCompare(b.name, "ru"),
)
writeFileSync(OUT, JSON.stringify(sorted, null, 2) + "\n")
console.log(`${sorted.length} dealers → src/data/dealers.json`)
