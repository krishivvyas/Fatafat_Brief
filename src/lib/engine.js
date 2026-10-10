import { METRO, AMTS, BRTS, INCIDENTS, REFERENCE_DATE, WEATHER_SNAPSHOT, SOURCES } from '../data/published.js'
import { LANGS, makeT, tx } from '../i18n.js'

// ---------- formatting ----------
export const fmtInt = (n) => (n == null ? '—' : Math.round(n).toLocaleString('en-IN'))
export const fmtRs = (n, lang = 'en') => {
  if (n == null) return '—'
  const t = makeT(lang)
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} ${t('cr')}`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} ${t('lakh')}`
  return `₹${fmtInt(n)}`
}
export const fmtPct = (n, digits = 1) => (n == null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(digits)}%`)
export const fmtDate = (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }, lang = 'en') =>
  new Date(`${iso}T00:00:00+05:30`).toLocaleDateString(LANGS[lang]?.locale ?? 'en-IN', { timeZone: 'Asia/Kolkata', ...opts })

const pctChange = (a, b) => (a == null || b == null || b === 0 ? null : ((a - b) / b) * 100)
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length

function pearson(xs, ys) {
  const mx = mean(xs), my = mean(ys)
  let num = 0, dx = 0, dy = 0
  xs.forEach((x, i) => {
    num += (x - mx) * (ys[i] - my)
    dx += (x - mx) ** 2
    dy += (ys[i] - my) ** 2
  })
  return dx && dy ? num / Math.sqrt(dx * dy) : null
}

// ---------- weather (Open-Meteo, real) ----------
const LAT = 23.0225, LON = 72.5714

export async function fetchWeatherArchive(start, end, signal) {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${start}&end_date=${end}&daily=precipitation_sum,temperature_2m_max&timezone=Asia%2FKolkata`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Open-Meteo archive HTTP ${res.status}`)
  const json = await res.json()
  return { daily: json.daily, fetchedAt: new Date().toISOString().slice(0, 10), live: true }
}

export async function fetchTodayForecast(signal) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max&forecast_days=1&timezone=Asia%2FKolkata`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Open-Meteo forecast HTTP ${res.status}`)
  const d = (await res.json()).daily
  return { date: d.time[0], rainMm: d.precipitation_sum[0], rainProb: d.precipitation_probability_max[0], tMax: d.temperature_2m_max[0] }
}

export const weatherSnapshot = () => ({ ...WEATHER_SNAPSHOT, live: false })

function weatherOn(weather, date) {
  const i = weather.daily.time.indexOf(date)
  return i < 0 ? null : { rainMm: weather.daily.precipitation_sum[i], tMax: weather.daily.temperature_2m_max[i] }
}

// ---------- dataset ----------
// The default dataset is built purely from published figures for the chosen day.
// An operator that published nothing for that day shows as "Not published".
// Operators can load their own MIS CSV to replace it with actual daily numbers.
const PUBLISHED_DATES = [...new Set([...METRO.dailySeries.map((d) => d.date), AMTS.referenceDay.date])].sort()

// Dates the user can report on, newest first, with the operators that have day figures.
export function availableDates(rows) {
  if (rows) {
    const by = {}
    for (const r of rows) (by[r.date] ??= new Set()).add(r.operator)
    return Object.keys(by).sort().reverse().map((date) => ({ date, operators: ['METRO', 'AMTS', 'BRTS'].filter((k) => by[date].has(k)) }))
  }
  return PUBLISHED_DATES.slice().reverse().map((date) => ({
    date,
    operators: [METRO.dailySeries.some((d) => d.date === date) && 'METRO', AMTS.referenceDay.date === date && 'AMTS'].filter(Boolean),
  }))
}

export function publishedDataset(date = REFERENCE_DATE, lang = 'en') {
  const t = makeT(lang)
  const series = METRO.dailySeries
  const ref = series.find((d) => d.date === date)
  const amts = AMTS.referenceDay.date === date ? AMTS.referenceDay : null
  const aug = METRO.august2026
  const avgFare = (aug.revenueCr * 1e7) / (aug.passengersLakh * 1e5)
  const notPublished = t('notPublishedFor', fmtDate(date, undefined, lang))
  return {
    date,
    lang,
    origin: 'published',
    operators: {
      METRO: {
        label: t('opMETRO'),
        riders: ref?.riders ?? null,
        ridersKind: ref ? 'day' : 'none',
        ridersNote: ref ? undefined : notPublished,
        revenueRs: ref ? ref.riders * avgFare : null,
        revenueKind: ref ? 'derived' : 'none',
        revenueNote: ref ? t('metroRevNote', { fare: avgFare.toFixed(2), cr: aug.revenueCr, lakh: aug.passengersLakh }) : undefined,
        otpPct: METRO.punctualityPct,
        otpNote: t('metroOtpNote'),
        series,
        facts: [
          [t('fNetwork'), t('kmStations', { km: METRO.networkKm, st: METRO.stations })],
          [t('fHeadway'), t('minutes', METRO.peakHeadwayMin)],
          [t('fAugRecord'), t('tripsCr', { l: aug.passengersLakh, cr: aug.revenueCr })],
          ['FY Oct25–Sep26', t('tripsCr', { l: METRO.yearly[3].passengersLakh, cr: METRO.yearly[3].revenueCr })],
        ],
        sources: [METRO.dailySeriesSource, METRO.yearlySource, METRO.networkSource],
      },
      AMTS: {
        label: t('opAMTS'),
        riders: amts?.riders ?? null,
        ridersKind: amts ? 'day' : 'none',
        ridersNote: amts ? undefined : `${notPublished}; ${t('amtsOnlyDay', fmtDate(AMTS.referenceDay.date, undefined, lang))}`,
        revenueRs: amts?.revenueRs ?? null,
        revenueKind: amts ? 'day' : 'none',
        otpPct: null,
        otpNote: t('amtsOtpNote'),
        series: [],
        facts: [
          ...(amts ? [
            [t('fBuses'), fmtInt(amts.busesOperated)],
            [t('fRidersPerBus'), fmtInt(amts.riders / amts.busesOperated)],
            [t('fRevPerRider'), `₹${(amts.revenueRs / amts.riders).toFixed(2)}`],
          ] : []),
          [t('fEbuses'), fmtInt(AMTS.electricBusesOrdered)],
        ],
        highlight: amts && tx(lang, amts.note),
        sources: [AMTS.source],
      },
      BRTS: {
        label: t('opBRTS'),
        riders: BRTS.officialAvgDaily,
        ridersKind: 'average',
        ridersNote: t('brtsAvgNote', { w: fmtInt(BRTS.wikiDaily.riders), asOf: tx(lang, BRTS.wikiDaily.asOf) }),
        revenueRs: null,
        revenueKind: 'none',
        otpPct: null,
        otpNote: t('brtsOtpNote'),
        series: [],
        facts: [
          [t('fCorridor'), t('kmStations', { km: BRTS.corridorKm, st: BRTS.stations })],
          [t('fFleet'), t('fleetVal', { b: BRTS.buses, e: BRTS.electricBuses })],
          [t('fRoutes'), `${BRTS.routes}`],
          [t('fHours'), t('brtsHours')],
        ],
        sources: [BRTS.officialSource, BRTS.wikiDaily.source],
      },
    },
    incidents: INCIDENTS.map((inc) => ({ ...inc, title: tx(lang, inc.title), detail: tx(lang, inc.detail) })),
  }
}

// CSV columns: date,operator,riders,revenue_rs,on_time_pct,incident
export const CSV_TEMPLATE =
  'date,operator,riders,revenue_rs,on_time_pct,incident\n' +
  'YYYY-MM-DD,METRO,,,,\nYYYY-MM-DD,AMTS,,,,\nYYYY-MM-DD,BRTS,,,,\n'

// Returns the valid rows (operator upper-cased); throws on an unusable file.
// Errors carry an i18n code so the UI can show them in the chosen language.
const csvError = (message, code, arg) => Object.assign(new Error(message), { code, arg })

export function parseMisCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  const header = lines.shift().split(',').map((h) => h.trim().toLowerCase())
  const need = ['date', 'operator', 'riders']
  for (const n of need) if (!header.includes(n)) throw csvError(`CSV missing column "${n}"`, 'csvMissingCol', n)
  const rows = lines.map((l) => {
    const cells = l.split(',')
    const o = {}
    header.forEach((h, i) => {
      // the incident column may itself contain commas
      o[h] = h === 'incident' ? cells.slice(i).join(',').trim() : (cells[i] ?? '').trim()
    })
    o.operator = o.operator.toUpperCase()
    return o
  })
  const valid = rows.filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && ['METRO', 'AMTS', 'BRTS'].includes(r.operator))
  if (!valid.length) throw csvError('No valid rows (need date YYYY-MM-DD and operator METRO/AMTS/BRTS)', 'csvNoRows')
  return valid
}

// Builds the dataset for one day of an uploaded MIS (default: the latest day).
// Operators missing that day fall back to whatever was published for the same day.
export function datasetFromRows(rows, date = rows.map((r) => r.date).sort().at(-1), lang = 'en') {
  const t = makeT(lang)
  const ds = publishedDataset(date, lang)
  ds.origin = 'uploaded'
  ds.incidents = []
  const num = (v) => (v === '' || v == null || isNaN(+v) ? null : +v)
  for (const key of ['METRO', 'AMTS', 'BRTS']) {
    const opRows = rows.filter((r) => r.operator === key).sort((a, b) => a.date.localeCompare(b.date))
    const day = opRows.filter((r) => r.date === date)
    const op = ds.operators[key]
    const hist = opRows.map((x) => ({ date: x.date, riders: num(x.riders) })).filter((x) => x.riders != null)
    if (hist.length > 1) op.series = hist
    if (!day.length) {
      op.stale = true
      continue
    }
    const r = day[0]
    op.riders = num(r.riders)
    op.ridersKind = op.riders == null ? 'none' : 'day'
    op.ridersNote = undefined
    op.revenueRs = num(r.revenue_rs)
    op.revenueKind = op.revenueRs == null ? 'none' : 'day'
    op.revenueNote = undefined
    op.otpPct = num(r.on_time_pct)
    op.otpNote = op.otpPct == null ? t('otpNotInUpload') : t('otpFromUpload')
    op.highlight = undefined
    op.sources = ['upload']
    day.forEach((d) => d.incident && ds.incidents.push({ date: d.date, operators: [key], severity: 'medium', title: d.incident, detail: '', source: 'upload' }))
  }
  return ds
}

// ---------- analysis ----------
export function analyse(ds, weather) {
  const ops = ds.operators
  const list = Object.entries(ops)
  const totalRiders = list.reduce((s, [, o]) => s + (o.riders ?? 0), 0)
  const dayLevelRiders = list.filter(([, o]) => o.ridersKind === 'day').reduce((s, [, o]) => s + o.riders, 0)
  const revenueReported = list.filter(([, o]) => o.revenueKind === 'day').reduce((s, [, o]) => s + o.revenueRs, 0)
  const revenueDerived = list.filter(([, o]) => o.revenueKind === 'derived').reduce((s, [, o]) => s + o.revenueRs, 0)

  const share = Object.fromEntries(list.map(([k, o]) => [k, o.riders ? (o.riders / totalRiders) * 100 : null]))

  // Metro day-over-day vs previous published day, and vs series average
  const s = ops.METRO.series
  const idx = s.findIndex((d) => d.date === ds.date)
  const metroPrev = idx > 0 ? s[idx - 1] : null
  const metroDod = metroPrev ? pctChange(ops.METRO.riders, metroPrev.riders) : null
  const seriesAvg = s.length ? mean(s.map((d) => d.riders)) : null
  const metroVsAvg = pctChange(ops.METRO.riders, seriesAvg)
  const seriesMax = s.length ? s.reduce((m, d) => (d.riders > m.riders ? d : m)) : null

  // Rain correlation across the published Metro days
  const paired = s.map((d) => ({ ...d, w: weatherOn(weather, d.date) })).filter((d) => d.w)
  const rainR = paired.length >= 4 ? pearson(paired.map((d) => d.w.rainMm), paired.map((d) => d.riders)) : null
  const wettest = paired.length ? paired.reduce((m, d) => (d.w.rainMm > m.w.rainMm ? d : m)) : null
  const wettestVsAvg = wettest ? pctChange(wettest.riders, seriesAvg) : null
  const refWeather = weatherOn(weather, ds.date)

  // Year-over-year (published FY totals)
  const y = METRO.yearly
  const fyGrowth = pctChange(y[3].passengersLakh, y[2].passengersLakh)
  const fyRevGrowth = pctChange(y[3].revenueCr, y[2].revenueCr)
  const fyAvgFare = (y[3].revenueCr * 1e7) / (y[3].passengersLakh * 1e5)

  // Data-quality exceptions are real findings, not decoration
  // gapOps[i] is the operator behind gaps[i]
  const t = makeT(ds.lang ?? 'en'), day = fmtDate(ds.date, undefined, ds.lang)
  const gaps = [], gapOps = []
  const gap = (k, text) => { gaps.push(text); gapOps.push(k) }
  for (const [k, o] of list) {
    if (o.ridersKind === 'none') gap(k, t('gapNoFigure', { op: o.label, d: day }))
    else if (o.ridersKind !== 'day') gap(k, t('gapNoDayLevel', o.label))
    if (o.revenueKind === 'none') gap(k, t('gapNoRevenue', o.label))
    if (o.otpPct == null) gap(k, t('gapNoOtp', o.label))
    if (o.stale) gap(k, t('gapMissingUpload', { op: o.label, d: day }))
  }

  return {
    totalRiders, dayLevelRiders, revenueReported, revenueDerived, share,
    metroPrev, metroDod, seriesAvg, metroVsAvg, seriesMax,
    paired, rainR, wettest, wettestVsAvg, refWeather,
    fyGrowth, fyRevGrowth, fyAvgFare, gaps, gapOps,
  }
}

// ---------- trends (full report) ----------
// Daily: each operator's day-level series (published, or from the uploaded MIS).
// Monthly: published month totals, plus month averages of the reported days
// (derived, so the day count is kept alongside). Yearly: published FY totals.
export function trends(ds, weather) {
  const daily = {}, monthAvg = {}
  for (const [k, o] of Object.entries(ds.operators)) {
    const s = o.series.filter((d) => d.riders != null)
    if (s.length < 2) continue
    daily[k] = s.map((d, i) => ({ ...d, change: i ? pctChange(d.riders, s[i - 1].riders) : null, rainMm: weatherOn(weather, d.date)?.rainMm ?? null }))
    const months = {}
    for (const d of s) (months[d.date.slice(0, 7)] ??= []).push(d.riders)
    monthAvg[k] = Object.entries(months).map(([month, xs]) => ({ month, days: xs.length, avg: mean(xs), max: Math.max(...xs) }))
  }

  const published = [['2026-08', METRO.august2026], ['2026-09', METRO.september2026]]
  const metroMonths = published.map(([month, m], i) => ({
    month, ...m,
    change: i ? pctChange(m.passengersLakh, published[i - 1][1].passengersLakh) : null,
  }))

  const fy = METRO.yearly.map((y, i, a) => ({
    ...y,
    tripsChange: i ? pctChange(y.passengersLakh, a[i - 1].passengersLakh) : null,
    revChange: i ? pctChange(y.revenueCr, a[i - 1].revenueCr) : null,
    avgFare: (y.revenueCr * 1e7) / (y.passengersLakh * 1e5),
  }))
  const avgDaily = METRO.avgDailyByYear.map((y, i, a) => ({ ...y, change: i ? pctChange(y.riders, a[i - 1].riders) : null }))

  return { daily, monthAvg, metroMonths, fy, avgDaily, eventPeaks: METRO.eventPeaks }
}

// ---------- insights (full report) ----------
// Plain-language readings of the trend numbers. Every statement is computed from
// the data passed in, so it changes (or disappears) when the data does.
// Each insight is a segment list, like ruleBrief.
const good = (t) => ({ t, tone: 'good' }), bad = (t) => ({ t, tone: 'bad' }), warn = (t) => ({ t, tone: 'warn' })
const seg = (...parts) => parts.filter(Boolean).map((x) => (typeof x === 'string' ? { t: x } : x))
const isWeekday = (iso) => ![0, 6].includes(new Date(`${iso}T00:00:00Z`).getUTCDay())
const tone = (v, t) => (v < 0 ? bad(t) : good(t))
const daysIn = (month) => new Date(+month.slice(0, 4), +month.slice(5, 7), 0).getDate()

export function insights(ds, a, tr) {
  const lang = ds.lang ?? 'en', t = makeT(lang)
  const short = (iso) => fmtDate(iso, { day: 'numeric', month: 'short' }, lang)
  const monthOf = (m) => fmtDate(`${m}-01`, { month: 'long' }, lang)
  const o = ds.operators
  const out = { summary: [], daily: {}, monthly: [], yearly: [], gaps: [] }

  // --- summary: who carries the city, who earns per trip
  const ranked = Object.entries(o).filter(([, op]) => op.riders).sort(([, x], [, y]) => y.riders - x.riders)
  if (ranked.length >= 2) {
    const [[topKey, top], [, next]] = ranked
    out.summary.push(seg(t('inCarriesA', top.label), good(t('inCarriesB', (top.riders / a.totalRiders * 100).toFixed(1))),
      t('inCarriesC', { x: (top.riders / next.riders).toFixed(1), next: next.label }), t(topKey === 'METRO' ? 'inBackboneRail' : 'inBackboneBus')))
  }
  const earning = Object.values(o).filter((op) => op.revenueRs && op.riders && op.ridersKind === 'day')
  if (earning.length >= 2) {
    const per = earning.map((op) => ({ op, v: op.revenueRs / op.riders })).sort((x, y) => y.v - x.v)
    const totalRev = earning.reduce((s, op) => s + op.revenueRs, 0), totalRid = earning.reduce((s, op) => s + op.riders, 0)
    const hi = per[0], lo = per.at(-1)
    out.summary.push(seg(
      t('inEarnA', { hi: hi.op.label, hv: hi.v.toFixed(2), lo: lo.op.label, lv: lo.v.toFixed(2), x: (hi.v / lo.v).toFixed(1) }),
      t('inEarnB', { hi: hi.op.label, p: (hi.op.riders / totalRid * 100).toFixed(0) }),
      good(t('inEarnC', (hi.op.revenueRs / totalRev * 100).toFixed(0))),
      hi.op.revenueKind === 'derived' ? t('inEarnDerived', hi.op.label) : t('dot'),
    ))
  }
  for (const op of Object.values(o)) if (op.highlight) out.summary.push(seg(`${op.label}: `, good(op.highlight), t('dot')))

  // --- daily: stability, direction, weekday coverage, rain, events
  for (const [k, rows] of Object.entries(tr.daily)) {
    const L = []
    const xs = rows.map((d) => d.riders), avg = mean(xs), min = Math.min(...xs), max = Math.max(...xs)
    const band = ((max - min) / 2 / avg) * 100, steady = band < 5
    L.push(seg(t('inBandA'), (steady ? good : warn)(t('inBandB', band.toFixed(1))), t('inBandC', { min: fmtInt(min), max: fmtInt(max), steady })))
    const first = rows[0], last = rows.at(-1), drift = pctChange(last.riders, first.riders)
    L.push(seg(t('inDriftA', { a: short(first.date), b: short(last.date) }), tone(drift, fmtPct(drift)), t('inDriftC', { top: last.riders === max, n: rows.length })))
    if (rows.every((d) => isWeekday(d.date))) L.push(seg(t('inWeekdays', rows.length)))
    if (k === 'METRO' && a.wettest && a.rainR != null) {
      const strength = Math.abs(a.rainR) < 0.3 ? 'weak' : Math.abs(a.rainR) < 0.6 ? 'moderate' : 'strong'
      L.push(seg(t('inWetA', { d: short(a.wettest.date), mm: a.wettest.w.rainMm }), tone(a.wettestVsAvg, t('inWetB', fmtPct(a.wettestVsAvg))),
        t('inWetC', { s: t(strength), r: a.rainR.toFixed(2) }), strength === 'weak' ? good(t('inRainWeak')) : warn(t('inRainStrong')), t('dot')))
    }
    if (k === 'METRO' && tr.eventPeaks.length) {
      const peak = tr.eventPeaks.reduce((m, e) => (e.riders > m.riders ? e : m))
      const n = peak.approx === 'over' ? t('overN', fmtInt(peak.riders)) : fmtInt(peak.riders)
      L.push(seg(t('inEventA', { ev: tx(lang, peak.label), d: short(peak.date), n }), warn(t('inEventB', pctChange(peak.riders, max).toFixed(1))), t('inEventC')))
    }
    out.daily[k] = L
  }

  // --- monthly: totals vs per-day, month average vs weekday average
  const mm = tr.metroMonths
  const perDay = (m) => (m.passengersLakh * 1e5) / daysIn(m.month)
  for (let i = 1; i < mm.length; i++) {
    const p = mm[i - 1], c = mm[i]
    const dayChange = pctChange(perDay(c), perDay(p))
    const kind = c.change < 0 && dayChange > 0 ? 'down' : c.change > 0 && dayChange < 0 ? 'up' : 'none'
    out.monthly.push(seg(t('inMonthA', monthOf(c.month)), tone(c.change, fmtPct(c.change)), t('inMonthB', monthOf(p.month)),
      tone(dayChange, fmtPct(dayChange)), t('inMonthC', { kind, c: monthOf(c.month) })))
  }
  const metroAvg = tr.monthAvg.METRO?.find((m) => mm.some((x) => x.month === m.month))
  const metroMonth = metroAvg && mm.find((x) => x.month === metroAvg.month)
  if (metroAvg && tr.daily.METRO?.every((d) => isWeekday(d.date))) {
    const allDays = perDay(metroMonth)
    out.monthly.push(seg(t('inMonthAvgA', { m: monthOf(metroMonth.month), n: fmtInt(allDays) }),
      warn(t('inMonthAvgB', Math.abs(pctChange(allDays, metroAvg.avg)).toFixed(1))), t('inMonthAvgC', fmtInt(metroAvg.avg))))
  }

  // --- yearly: growth path, compounding, fares vs volume
  const fy = tr.fy, yoy = fy.slice(1).map((y) => y.tripsChange)
  if (yoy.length >= 2) {
    const slowing = yoy.every((v, i) => i === 0 || v < yoy[i - 1])
    out.yearly.push(seg(t('inYoyA', yoy.map((v) => fmtPct(v)).join(' → ')),
      slowing ? warn(t('inSlowing')) : good(t('inHolding')), yoy.at(-1) >= 10 ? t('inDouble') : t('dot')))
    const yrs = fy.length - 1, x = fy.at(-1).passengersLakh / fy[0].passengersLakh
    out.yearly.push(seg(t('inCagrA', { y: yrs, a: fy[0].passengersLakh, b: fy.at(-1).passengersLakh }),
      good(t('inCagrB', { x: x.toFixed(1), c: ((Math.pow(x, 1 / yrs) - 1) * 100).toFixed(1) })), t('dot')))
  }
  const fares = fy.map((y) => y.avgFare), last = fy.at(-1)
  // Only claim "volume, not fares" when the fare barely moved.
  if (Math.max(...fares) / Math.min(...fares) < 1.1) {
    out.yearly.push(seg(t('inFareA', { min: Math.min(...fares).toFixed(2), max: Math.max(...fares).toFixed(2), r: fmtPct(last.revChange), t: fmtPct(last.tripsChange) }),
      good(t('inFareB')), t('dot')))
  }
  const ad = tr.avgDaily
  if (ad.length >= 2) {
    out.yearly.push(seg(t('inAvgDaily', { a: fmtInt(ad[0].riders), ay: tx(lang, ad[0].year), b: fmtInt(ad.at(-1).riders), by: tx(lang, ad.at(-1).year) }),
      good(`${(ad.at(-1).riders / ad[0].riders).toFixed(1)}×`), t('dot')))
  }

  // --- gaps: how much of the picture is missing, and who can close it
  const metrics = Object.values(o).flatMap((op) => [op.ridersKind === 'day', op.revenueKind !== 'none', op.otpPct != null])
  const have = metrics.filter(Boolean).length, missing = have < metrics.length
  out.gaps.push(seg(missing && t('inGapsA'), (missing ? warn : good)(t('inGapsOf', { h: have, n: metrics.length })), t('inGapsB')))
  const worst = Object.entries(o).map(([k, op]) => ({ op, n: a.gapOps.filter((g) => g === k).length })).sort((x, y) => y.n - x.n)[0]
  if (worst?.n) out.gaps.push(seg(t('inWorstA', { op: worst.op.label, n: worst.n, total: a.gaps.length }), bad(t('inWorstB', worst.op.label)), t('dot')))
  return out
}

// ---------- rule-based brief (offline-safe) ----------
// Returns an array of segments: { t: text, tone?: 'bad' | 'good' | 'warn' }
export function ruleBrief(ds, a, today) {
  const lang = ds.lang ?? 'en', t = makeT(lang)
  const D = (iso, opts = { day: 'numeric', month: 'short' }) => fmtDate(iso, opts, lang)
  const o = ds.operators
  const seg = []
  const p = (t, tone) => seg.push({ t, tone })

  p(t('rbIntro', D(ds.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })))
  const missing = Object.values(o).filter((op) => op.riders == null).map((op) => op.label)
  p(t('rbMoved', { all: !missing.length, n: fmtInt(a.totalRiders) }))
  p(o.BRTS.ridersKind === 'average' ? t('rbBrtsAvg', fmtInt(o.BRTS.riders)) : t('stop'))
  if (missing.length) p(t('rbMissing', missing.join(t('and'))), 'bad')

  if (o.AMTS.riders != null) {
    p(t('rbAmts', { n: fmtInt(o.AMTS.riders), s: a.share.AMTS?.toFixed(1) }))
    if (o.AMTS.highlight) p(` — ${lang === 'en' ? o.AMTS.highlight.toLowerCase() : o.AMTS.highlight}`, 'good')
    if (o.AMTS.revenueRs) p(t('rbCollect', fmtRs(o.AMTS.revenueRs, lang)))
    p(t('stop'))
  }

  if (o.METRO.riders != null) {
    p(t('rbMetro', fmtInt(o.METRO.riders)))
    if (a.metroDod != null) p(t('rbDod', { p: fmtPct(a.metroDod), d: D(a.metroPrev.date) }), a.metroDod < 0 ? 'bad' : 'good')
    if (a.seriesMax?.date === ds.date && o.METRO.series.length > 2) p(t('rbHighest'), 'good')
    p(t('rbPunct', o.METRO.otpPct ?? '—'))
  }

  if (a.refWeather) {
    p(t('rbRain', { mm: a.refWeather.rainMm, t: a.refWeather.tMax }), a.refWeather.rainMm >= 20 ? 'warn' : undefined)
    p(t('stop'))
  }
  if (a.wettest && a.wettest.w.rainMm >= 20) {
    p(t('rbWetA', { d: D(a.wettest.date), mm: a.wettest.w.rainMm }))
    p(t('rbWetB', fmtPct(a.wettestVsAvg)), a.wettestVsAvg < 0 ? 'bad' : 'good')
    p(t('rbWetC', { r: a.rainR?.toFixed(2), n: a.paired.length }))
  }

  p(t('rbFy', { t: fmtPct(a.fyGrowth), r: fmtPct(a.fyRevGrowth) }), 'good')

  for (const inc of ds.incidents) {
    p(t('rbDisruption', { d: D(inc.date), ops: inc.operators.join('/'), title: inc.title }), 'bad')
  }
  if (today) {
    p(t('rbToday', { d: D(today.date), mm: today.rainMm, p: today.rainProb, t: today.tMax }), today.rainProb >= 60 ? 'warn' : undefined)
  }
  if (a.gaps.length) p(t('rbGaps', a.gaps.join('; ')), 'warn')
  return seg
}

// ---------- WhatsApp briefs ----------
export function ministryWhatsApp(ds, a, today) {
  const lang = ds.lang ?? 'en', t = makeT(lang)
  const o = ds.operators
  const L = []
  L.push(t('waTitle'))
  L.push(`_${fmtDate(ds.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }, lang)}_`)
  L.push('')
  L.push(t('waSystem', { n: fmtInt(a.totalRiders), avg: o.BRTS.ridersKind === 'average' }))
  const line = (icon, k, extra) => L.push(o[k].riders == null ? `• ${icon} ${o[k].label}: ${t('waNotPub')}` : `• ${icon} ${o[k].label}: ${fmtInt(o[k].riders)} (${a.share[k]?.toFixed(0)}%)${extra}`)
  line('🚌', 'AMTS', o.AMTS.revenueRs ? ` · ${fmtRs(o.AMTS.revenueRs, lang)}` : '')
  line('🚇', 'METRO', a.metroDod != null ? ` · ${fmtPct(a.metroDod)} ${t('dod')}` : '')
  line('🚍', 'BRTS', o.BRTS.ridersKind === 'average' ? ` ${t('waAvg')}` : '')
  L.push('')
  L.push(t('waSignals'))
  if (o.AMTS.highlight) L.push(`✅ AMTS: ${o.AMTS.highlight}`)
  L.push(t('waFy', { l: METRO.yearly[3].passengersLakh, y: fmtPct(a.fyGrowth), cr: METRO.yearly[3].revenueCr, r: fmtPct(a.fyRevGrowth) }))
  if (o.METRO.otpPct != null) L.push(t('waPunct', o.METRO.otpPct))
  if (a.wettest && a.wettest.w.rainMm >= 20) L.push(t('waRain', { mm: a.wettest.w.rainMm, p: fmtPct(a.wettestVsAvg) }))
  if (a.gaps.length) {
    L.push('')
    L.push(t('waGaps'))
    a.gaps.forEach((g) => L.push(`• ${g}`))
  }
  if (today) L.push('', t('waToday', { mm: today.rainMm, p: today.rainProb, t: today.tMax }))
  L.push('', t('waFooter'))
  return L.join('\n')
}

export function opsWhatsApp(ds, a, today) {
  const lang = ds.lang ?? 'en', t = makeT(lang)
  const D = (iso) => fmtDate(iso, { day: 'numeric', month: 'short' }, lang)
  const o = ds.operators
  const L = []
  L.push(t('opsHead', D(ds.date)))
  L.push(t('opsSub'))
  L.push('')
  let n = 0
  for (const inc of ds.incidents) {
    n++
    L.push(`🔴 *${inc.operators.join('/')}* (${D(inc.date)}): ${inc.title}`)
    if (inc.detail) L.push(`   ${inc.detail}`)
  }
  if (a.metroDod != null && a.metroDod < -5) {
    n++
    L.push(t('opsMetroDrop', fmtPct(a.metroDod)))
  }
  if (a.refWeather && a.refWeather.rainMm >= 20) {
    n++
    L.push(t('opsRain', a.refWeather.rainMm))
  }
  if (today && today.rainProb >= 60) {
    n++
    L.push(t('opsToday', { p: today.rainProb, mm: today.rainMm }))
  }
  for (const op of Object.values(o)) if (op.stale) { n++; L.push(t('opsStale', op.label)) }
  if (!n) L.push(t('opsNone'))
  L.push('', t('opsFooter', a.gaps.length))
  return L.join('\n')
}

export function sourceList(ids, lang = 'en') {
  const t = makeT(lang)
  return ids.map((id) => (id === 'upload' ? { title: t('uploadedMis'), publisher: t('you'), url: null } : SOURCES[id])).filter(Boolean)
}
