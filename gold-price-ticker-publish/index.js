/**
 * Host half of the live gold price ticker.
 *
 * Two native quotes are combined here:
 * - London spot gold in USD per troy ounce (gold-api.com, with Sina as fallback)
 * - Shanghai Gold Exchange Au99.99 in CNY per gram (Sina's SGE feed)
 *
 * The CNY price is never derived from the USD price. The browser polls one
 * same-origin route, and the Host keeps separate short caches for the fast SGE
 * feed and the 30-second international spot feed.
 */

const TROY_OUNCE_GRAMS = 31.1034768

const GOLD_USD_URL = 'https://api.gold-api.com/price/XAU'
const SINA_URL =
  'https://hq.sinajs.cn/list=SGE_AU9999,gds_AU9999,SGE_AUTD,gds_AUTD,hf_XAU,USDCNY'
const SINA_REFERER = 'https://finance.sina.com.cn'

const QUOTE_PATH = '/plugins/gold-price-ticker/quote'
const FETCH_TIMEOUT_MS = 9_000
const SINA_CACHE_TTL_MS = 8_000
const GOLD_CACHE_TTL_MS = 30_000

export const inject = ['webServer']

export function apply(ctx) {
  let sinaCache = { at: 0, data: null }
  let sinaInflight = null
  let goldCache = { at: 0, data: null }
  let goldInflight = null

  async function fetchJson(url) {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'dsh-gold-price-ticker/1.1',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new Error(`${new URL(url).host} returned HTTP ${response.status}`)
    }
    return response.json()
  }

  async function fetchSina() {
    const response = await fetch(SINA_URL, {
      headers: {
        accept: 'text/plain, */*',
        referer: SINA_REFERER,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new Error(`Sina quote feed returned HTTP ${response.status}`)
    }
    const text = await response.text()
    const parsed = parseSina(text)
    if (!parsed.cny) {
      throw new Error('The Shanghai gold quote was empty')
    }
    return parsed
  }

  async function getSina() {
    if (sinaCache.data && Date.now() - sinaCache.at < SINA_CACHE_TTL_MS) {
      return sinaCache.data
    }
    if (sinaInflight) return sinaInflight

    sinaInflight = (async () => {
      try {
        const data = await fetchSina()
        sinaCache = { at: Date.now(), data: { ...data, stale: false } }
        return sinaCache.data
      } catch (error) {
        if (sinaCache.data) {
          return { ...sinaCache.data, stale: true, warning: messageOf(error) }
        }
        throw error
      } finally {
        sinaInflight = null
      }
    })()
    return sinaInflight
  }

  async function getGoldUsd() {
    if (goldCache.data && Date.now() - goldCache.at < GOLD_CACHE_TTL_MS) {
      return goldCache.data
    }
    if (goldInflight) return goldInflight

    goldInflight = (async () => {
      try {
        const payload = await fetchJson(GOLD_USD_URL)
        const price = positiveNumber(payload?.price)
        if (price === null) throw new Error('The international gold quote was empty')
        const data = {
          price,
          updatedAt: isoTimestamp(payload?.updatedAt),
          stale: false,
        }
        goldCache = { at: Date.now(), data }
        return data
      } catch (error) {
        if (goldCache.data) {
          return { ...goldCache.data, stale: true, warning: messageOf(error) }
        }
        throw error
      } finally {
        goldInflight = null
      }
    })()
    return goldInflight
  }

  async function buildQuote() {
    const [sinaResult, goldResult] = await Promise.allSettled([
      getSina(),
      getGoldUsd(),
    ])

    if (sinaResult.status === 'rejected') {
      throw new Error(
        `Shanghai gold quote unavailable: ${messageOf(sinaResult.reason)}`,
      )
    }

    const sina = sinaResult.value
    const gold = goldResult.status === 'fulfilled' ? goldResult.value : null
    const usdSina = sina.usd
    const cny = sina.cny

    const usdPerOunce = gold?.price ?? usdSina?.current
    if (!isPositive(usdPerOunce)) {
      throw new Error('No usable USD gold quote was available')
    }
    if (!cny || !isPositive(cny.current)) {
      throw new Error('No usable Shanghai gold quote was available')
    }

    const usdOpen = usdSina?.open ?? null
    const usdPreviousClose = usdSina?.previousClose ?? null
    const usdHigh = usdSina?.high ?? null
    const usdLow = usdSina?.low ?? null
    const cnyOpen = cny.open ?? null
    const cnyPreviousClose = cny.previousClose ?? null
    const cnyHigh = cny.high ?? null
    const cnyLow = cny.low ?? null

    const warnings = []
    if (sina.stale) warnings.push('Shanghai quote is stale')
    if (sina.warning) warnings.push(sina.warning)
    if (!gold && usdSina) warnings.push('USD quote is using the Sina fallback')
    if (gold?.stale && gold.warning) warnings.push(gold.warning)

    const cnyUpdatedMs = Date.parse(cny.updatedAt)
    const cnyAgeMs = Number.isFinite(cnyUpdatedMs)
      ? Date.now() - cnyUpdatedMs
      : null
    const usdUpdatedAt = gold?.updatedAt ?? usdSina?.updatedAt ?? null
    const usdUpdatedMs = Date.parse(usdUpdatedAt)
    const usdAgeMs = Number.isFinite(usdUpdatedMs)
      ? Date.now() - usdUpdatedMs
      : null

    // The card's live/closed state follows the international spot market,
    // not the Shanghai session. Shanghai's own session is reported separately
    // so a frozen CNY quote is still explained.
    const marketOpen = usdAgeMs === null ? true : usdAgeMs < 5 * 60_000
    const cnyMarketOpen =
      cnyAgeMs === null ? true : cnyAgeMs < 3 * 60_000

    return {
      // Native quotes, never a currency conversion.
      usdPerOunce: round(usdPerOunce, 4),
      usdPerGram: round(usdPerOunce / TROY_OUNCE_GRAMS, 4),
      usdOpen: roundOrNull(usdOpen, 4),
      usdPreviousClose: roundOrNull(usdPreviousClose, 4),
      usdHigh: roundOrNull(usdHigh, 4),
      usdLow: roundOrNull(usdLow, 4),
      usdChangePct: percentChange(usdPerOunce, usdOpen),
      usdOpenSource: 'sina',

      cnyPerGram: round(cny.current, 4),
      cnyPerOunce: round(cny.current * TROY_OUNCE_GRAMS, 4),
      cnyOpen: roundOrNull(cnyOpen, 4),
      cnyPreviousClose: roundOrNull(cnyPreviousClose, 4),
      cnyHigh: roundOrNull(cnyHigh, 4),
      cnyLow: roundOrNull(cnyLow, 4),
      cnyChangePct: percentChange(cny.current, cnyOpen),
      cnyInstrument: cny.instrument,

      // A reference rate only; neither displayed price is derived from it.
      usdCny: sina.fx?.rate ?? null,

      updatedAt: latestIso([cny.updatedAt, usdUpdatedAt]),
      cnyUpdatedAt: cny.updatedAt ?? null,
      usdUpdatedAt,
      marketOpen,
      cnyMarketOpen,
      quoteAgeSeconds:
        usdAgeMs === null ? null : Math.max(0, Math.round(usdAgeMs / 1000)),
      cnyQuoteAgeSeconds:
        cnyAgeMs === null ? null : Math.max(0, Math.round(cnyAgeMs / 1000)),
      fetchedAt: new Date().toISOString(),
      stale: Boolean(sina.stale || gold?.stale),
      warning: warnings.length ? warnings.join('; ') : null,
      sources: {
        usd: gold ? 'gold-api' : 'sina',
        cny: 'sina-sge',
        fx: 'sina',
      },
    }
  }

  const handler = async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      sendJson(response, 405, { ok: false, error: 'Method not allowed' }, request.method)
      return
    }

    try {
      const quote = await buildQuote()
      sendJson(response, 200, { ok: true, ...quote }, request.method)
    } catch (error) {
      sendJson(
        response,
        502,
        {
          ok: false,
          error: messageOf(error),
          fetchedAt: new Date().toISOString(),
        },
        request.method,
      )
    }
  }

  ctx.effect(() =>
    ctx.webServer.register({
      kind: 'exact',
      path: QUOTE_PATH,
      handler,
    }),
  )
}

function parseSina(text) {
  const sge99 = readSinaRow(text, 'SGE_AU9999')
  const gds99 = readSinaRow(text, 'gds_AU9999')
  const sgeTd = readSinaRow(text, 'SGE_AUTD')
  const gdsTd = readSinaRow(text, 'gds_AUTD')

  const cny =
    mergeCny(sge99, gds99, 'Au99.99') ??
    mergeCny(sgeTd, gdsTd, 'Au(T+D)')

  return {
    cny,
    usd: parseSinaUsd(readSinaRow(text, 'hf_XAU')),
    fx: parseSinaFx(readSinaRow(text, 'USDCNY')),
  }
}

function readSinaRow(text, code) {
  const match = text.match(new RegExp(`var hq_str_${code}="([^"]*)"`))
  if (!match || !match[1]) return null
  const fields = match[1].split(',')
  return fields.length ? fields : null
}

function mergeCny(sge, gds, instrument) {
  const sgeQuote = parseSgeCny(sge)
  const gdsQuote = parseGdsCny(gds)
  if (!sgeQuote && !gdsQuote) return null

  const current = sgeQuote?.current ?? gdsQuote?.current ?? null
  if (!isPositive(current)) return null

  return {
    current,
    open: sgeQuote?.open ?? gdsQuote?.open ?? null,
    previousClose:
      sgeQuote?.previousClose ?? gdsQuote?.previousClose ?? null,
    high: sgeQuote?.high ?? gdsQuote?.high ?? null,
    low: sgeQuote?.low ?? gdsQuote?.low ?? null,
    updatedAt: sgeQuote?.updatedAt ?? gdsQuote?.updatedAt ?? null,
    instrument,
  }
}

function parseSgeCny(fields) {
  if (!fields || fields.length < 18) return null
  const current = positiveNumber(fields[3])
  if (current === null) return null
  return {
    current,
    previousClose: positiveNumber(fields[5]),
    open: positiveNumber(fields[6]),
    high: positiveNumber(fields[7]),
    low: positiveNumber(fields[8]),
    updatedAt: parseChinaStamp(fields[16]),
  }
}

function parseGdsCny(fields) {
  if (!fields || fields.length < 14) return null
  const current = positiveNumber(fields[0])
  if (current === null) return null
  return {
    current,
    previousClose: positiveNumber(fields[7]),
    open: positiveNumber(fields[8]),
    high: positiveNumber(fields[4]),
    low: positiveNumber(fields[5]),
    updatedAt: parseChinaDateTime(fields[12], fields[6]),
  }
}

function parseSinaUsd(fields) {
  if (!fields || fields.length < 13) return null
  const current = positiveNumber(fields[0])
  if (current === null) return null
  return {
    current,
    previousClose: positiveNumber(fields[1]) ?? positiveNumber(fields[7]),
    // hf_XAU carries the session open after the bid/ask pair; field 2 is the
    // current quote, not the open.
    open: positiveNumber(fields[8]) ?? positiveNumber(fields[2]),
    high: positiveNumber(fields[4]),
    low: positiveNumber(fields[5]),
    updatedAt: parseChinaDateTime(fields[12], fields[6]),
  }
}

function parseSinaFx(fields) {
  if (!fields || fields.length < 10) return null
  const rate = positiveNumber(fields[1])
  if (rate === null) return null
  const date = fields[fields.length - 1]
  return {
    rate,
    updatedAt: parseChinaDateTime(date, fields[0]),
  }
}

function parseChinaStamp(value) {
  if (typeof value !== 'string') return null
  const match = value.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/,
  )
  return match ? parseChinaDateTime(match[1], match[2]) : null
}

function parseChinaDateTime(date, time) {
  if (typeof date !== 'string' || typeof time !== 'string') return null
  const dateMatch = date.match(/^\d{4}-\d{2}-\d{2}$/)
  const timeMatch = time.match(/^\d{2}:\d{2}:\d{2}$/)
  if (!dateMatch || !timeMatch) return null
  const parsed = Date.parse(`${date}T${time}+08:00`)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
}

function isPositive(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function positiveNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return isPositive(parsed) ? parsed : null
}

function percentChange(current, open) {
  if (!isPositive(current) || !isPositive(open)) return null
  return round(((current - open) / open) * 100, 4)
}

function round(value, digits) {
  if (!Number.isFinite(value)) return null
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function roundOrNull(value, digits) {
  return isPositive(value) ? round(value, digits) : null
}

function isoTimestamp(value) {
  if (typeof value !== 'string') return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
}

function latestIso(values) {
  const times = values
    .map((value) => (typeof value === 'string' ? Date.parse(value) : Number.NaN))
    .filter(Number.isFinite)
  return new Date(times.length ? Math.max(...times) : Date.now()).toISOString()
}

function messageOf(error) {
  if (error instanceof Error && error.message) return error.message
  return String(error ?? 'Unknown error')
}

function sendJson(response, status, payload, method) {
  const body = JSON.stringify(payload)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  if (method === 'HEAD') response.end()
  else response.end(body)
}
