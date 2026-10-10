import { METRO, AMTS, BRTS, INCIDENTS, REFERENCE_DATE, WEATHER_SNAPSHOT, SOURCES } from '../data/published.js'

// ---------- formatting ----------
export const fmtInt = (n) => (n == null ? '—' : Math.round(n).toLocaleString('en-IN'))
export const fmtLakh = (n) => (n == null ? '—' : `${(n / 1e5).toFixed(2)} lakh`)
export const fmtRs = (n) => {
  if (n == null) return '—'
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} lakh`
  return `₹${fmtInt(n)}`
}
export const fmtPct = (n, digits = 1) => (n == null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(digits)}%`)
export const fmtDate = (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  new Date(`${iso}T00:00:00+05:30`).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', ...opts })

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

export function publishedDataset(date = REFERENCE_DATE) {
  const series = METRO.dailySeries
  const ref = series.find((d) => d.date === date)
  const amts = AMTS.referenceDay.date === date ? AMTS.referenceDay : null
  const aug = METRO.august2026
  const avgFare = (aug.revenueCr * 1e7) / (aug.passengersLakh * 1e5)
  const notPublished = `Not published for ${fmtDate(date)}`
  return {
    date,
    origin: 'published',
    operators: {
      METRO: {
        label: 'Metro',
        riders: ref?.riders ?? null,
        ridersKind: ref ? 'day' : 'none',
        ridersNote: ref ? undefined : notPublished,
        revenueRs: ref ? ref.riders * avgFare : null,
        revenueKind: ref ? 'derived' : 'none',
        revenueNote: ref ? `Riders × ₹${avgFare.toFixed(2)} avg fare (Aug 2026: ₹${aug.revenueCr} cr / ${aug.passengersLakh} lakh trips)` : undefined,
        otpPct: METRO.punctualityPct,
        otpNote: 'Punctuality reported for Oct 2022–Sep 2026',
        series,
        facts: [
          ['Network', `${METRO.networkKm} km · ${METRO.stations} stations`],
          ['Peak headway (E–W)', `${METRO.peakHeadwayMin} min`],
          ['Aug 2026 (record month)', `${aug.passengersLakh} lakh trips · ₹${aug.revenueCr} cr`],
          ['FY Oct25–Sep26', `${METRO.yearly[3].passengersLakh} lakh trips · ₹${METRO.yearly[3].revenueCr} cr`],
        ],
        sources: [METRO.dailySeriesSource, METRO.yearlySource, METRO.networkSource],
      },
      AMTS: {
        label: 'AMTS',
        riders: amts?.riders ?? null,
        ridersKind: amts ? 'day' : 'none',
        ridersNote: amts ? undefined : `${notPublished}; AMTS has published day figures only for ${fmtDate(AMTS.referenceDay.date)}`,
        revenueRs: amts?.revenueRs ?? null,
        revenueKind: amts ? 'day' : 'none',
        otpPct: null,
        otpNote: 'AMTS does not publish on-time performance',
        series: [],
        facts: [
          ...(amts ? [
            ['Buses operated', fmtInt(amts.busesOperated)],
            ['Riders per bus', fmtInt(amts.riders / amts.busesOperated)],
            ['Revenue per rider', `₹${(amts.revenueRs / amts.riders).toFixed(2)}`],
          ] : []),
          ['E-buses on order', fmtInt(AMTS.electricBusesOrdered)],
        ],
        highlight: amts?.note,
        sources: [AMTS.source],
      },
      BRTS: {
        label: 'BRTS',
        riders: BRTS.officialAvgDaily,
        ridersKind: 'average',
        ridersNote: `Official average; Janmarg does not publish day-level ridership (Wikipedia: ${fmtInt(BRTS.wikiDaily.riders)}/day, ${BRTS.wikiDaily.asOf})`,
        revenueRs: null,
        revenueKind: 'none',
        otpPct: null,
        otpNote: 'Janmarg does not publish on-time performance',
        series: [],
        facts: [
          ['Corridor', `${BRTS.corridorKm} km · ${BRTS.stations} stations`],
          ['Fleet', `${BRTS.buses} buses (${BRTS.electricBuses} electric)`],
          ['Routes', `${BRTS.routes}`],
          ['Hours', BRTS.hours],
        ],
        sources: [BRTS.officialSource, BRTS.wikiDaily.source],
      },
    },
    incidents: INCIDENTS,
  }
}

// CSV columns: date,operator,riders,revenue_rs,on_time_pct,incident
export const CSV_TEMPLATE =
  'date,operator,riders,revenue_rs,on_time_pct,incident\n' +
  'YYYY-MM-DD,METRO,,,,\nYYYY-MM-DD,AMTS,,,,\nYYYY-MM-DD,BRTS,,,,\n'

// Returns the valid rows (operator upper-cased); throws on an unusable file.
export function parseMisCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  const header = lines.shift().split(',').map((h) => h.trim().toLowerCase())
  const need = ['date', 'operator', 'riders']
  for (const n of need) if (!header.includes(n)) throw new Error(`CSV missing column "${n}"`)
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
  if (!valid.length) throw new Error('No valid rows (need date YYYY-MM-DD and operator METRO/AMTS/BRTS)')
  return valid
}

// Builds the dataset for one day of an uploaded MIS (default: the latest day).
// Operators missing that day fall back to whatever was published for the same day.
export function datasetFromRows(rows, date = rows.map((r) => r.date).sort().at(-1)) {
  const ds = publishedDataset(date)
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
    op.otpNote = op.otpPct == null ? 'Not provided in upload' : 'From uploaded MIS'
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
  const gaps = []
  for (const [k, o] of list) {
    if (o.ridersKind === 'none') gaps.push(`${o.label}: no ridership figure for ${fmtDate(ds.date)}`)
    else if (o.ridersKind !== 'day') gaps.push(`${o.label}: no day-level ridership published`)
    if (o.revenueKind === 'none') gaps.push(`${o.label}: revenue not published`)
    if (o.otpPct == null) gaps.push(`${o.label}: on-time performance not published`)
    if (o.stale) gaps.push(`${o.label}: missing from uploaded MIS for ${ds.date}`)
  }

  return {
    totalRiders, dayLevelRiders, revenueReported, revenueDerived, share,
    metroPrev, metroDod, seriesAvg, metroVsAvg, seriesMax,
    paired, rainR, wettest, wettestVsAvg, refWeather,
    fyGrowth, fyRevGrowth, fyAvgFare, gaps,
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
const short = (iso) => fmtDate(iso, { day: 'numeric', month: 'short' })
const tone = (v, t) => (v < 0 ? bad(t) : good(t))

export function insights(ds, a, tr) {
  const o = ds.operators
  const out = { summary: [], daily: {}, monthly: [], yearly: [], gaps: [] }

  // --- summary: who carries the city, who earns per trip
  const ranked = Object.values(o).filter((op) => op.riders).sort((x, y) => y.riders - x.riders)
  if (ranked.length >= 2) {
    const [top, next] = ranked
    const backbone = top.label === 'Metro' ? 'Rail is now the backbone of daily travel.' : 'Buses, not rail, are still the backbone of daily travel.'
    out.summary.push(seg(`${top.label} carries `, good(`${(top.riders / a.totalRiders * 100).toFixed(1)}% of all riders`),
      ` — ${(top.riders / next.riders).toFixed(1)}× ${next.label}. ${backbone}`))
  }
  const earning = Object.values(o).filter((op) => op.revenueRs && op.riders && op.ridersKind === 'day')
  if (earning.length >= 2) {
    const per = earning.map((op) => ({ op, v: op.revenueRs / op.riders })).sort((x, y) => y.v - x.v)
    const totalRev = earning.reduce((s, op) => s + op.revenueRs, 0), totalRid = earning.reduce((s, op) => s + op.riders, 0)
    const hi = per[0], lo = per.at(-1)
    out.summary.push(seg(
      `${hi.op.label} earns ₹${hi.v.toFixed(2)} per rider vs ₹${lo.v.toFixed(2)} for ${lo.op.label} (${(hi.v / lo.v).toFixed(1)}×). `,
      `${hi.op.label} is ${(hi.op.riders / totalRid * 100).toFixed(0)}% of these riders but `,
      good(`${(hi.op.revenueRs / totalRev * 100).toFixed(0)}% of the fare revenue`),
      hi.op.revenueKind === 'derived' ? ` (${hi.op.label} revenue is derived from its average fare).` : '.',
    ))
  }
  for (const op of Object.values(o)) if (op.highlight) out.summary.push(seg(`${op.label}: `, good(op.highlight), '.'))

  // --- daily: stability, direction, weekday coverage, rain, events
  for (const [k, rows] of Object.entries(tr.daily)) {
    const L = []
    const xs = rows.map((d) => d.riders), avg = mean(xs), min = Math.min(...xs), max = Math.max(...xs)
    const band = ((max - min) / 2 / avg) * 100
    L.push(seg(`Ridership stayed within a `, band < 5 ? good(`±${band.toFixed(1)}% band`) : warn(`±${band.toFixed(1)}% band`),
      ` (${fmtInt(min)} to ${fmtInt(max)}) — ${band < 5 ? 'demand is steady and predictable day to day' : 'demand swings noticeably between days'}.`))
    const first = rows[0], last = rows.at(-1), drift = pctChange(last.riders, first.riders)
    L.push(seg(`From ${short(first.date)} to ${short(last.date)} ridership moved `, tone(drift, fmtPct(drift)),
      last.riders === max ? ` and the latest day is the highest of the ${rows.length} reported` : '', '.'))
    if (rows.every((d) => isWeekday(d.date))) L.push(seg(`All ${rows.length} reported days are weekdays, so this is routine working-day demand; weekends are not covered.`))
    if (k === 'METRO' && a.wettest && a.rainR != null) {
      const strength = Math.abs(a.rainR) < 0.3 ? 'weak' : Math.abs(a.rainR) < 0.6 ? 'moderate' : 'strong'
      L.push(seg(`On the wettest day (${short(a.wettest.date)}, ${a.wettest.w.rainMm} mm) ridership was `, tone(a.wettestVsAvg, `${fmtPct(a.wettestVsAvg)} vs average`),
        `; the rain–ridership link is ${strength} (r = ${a.rainR.toFixed(2)}). `,
        strength === 'weak' ? good('Heavy rain barely dents Metro demand') : warn('Rain clearly affects Metro demand'), '.'))
    }
    if (k === 'METRO' && tr.eventPeaks.length) {
      const peak = tr.eventPeaks.reduce((m, e) => (e.riders > m.riders ? e : m))
      L.push(seg(`Event days go higher: ${peak.label} (${short(peak.date)}) drew ${peak.approx === 'over' ? 'over ' : ''}${fmtInt(peak.riders)}, `,
        warn(`${pctChange(peak.riders, max).toFixed(1)}% above the busiest routine day`), ' — plan extra trains for match days.'))
    }
    out.daily[k] = L
  }

  // --- monthly: totals vs per-day, month average vs weekday average
  const mm = tr.metroMonths
  for (let i = 1; i < mm.length; i++) {
    const p = mm[i - 1], c = mm[i]
    const perDay = (m) => (m.passengersLakh * 1e5) / new Date(+m.month.slice(0, 4), +m.month.slice(5, 7), 0).getDate()
    const dayChange = pctChange(perDay(c), perDay(p))
    const name = (m) => fmtDate(`${m.month}-01`, { month: 'long' })
    out.monthly.push(seg(`${name(c)} total trips were `, tone(c.change, fmtPct(c.change)), ` vs ${name(p)}, but per day ridership was `, tone(dayChange, fmtPct(dayChange)),
      Math.sign(c.change) !== Math.sign(dayChange) ? ` — the drop is mostly because ${name(c)} has fewer days, not weaker demand.` : '.'))
  }
  const metroAvg = tr.monthAvg.METRO?.find((m) => mm.some((x) => x.month === m.month))
  const metroMonth = metroAvg && mm.find((x) => x.month === metroAvg.month)
  if (metroAvg && tr.daily.METRO?.every((d) => isWeekday(d.date))) {
    const allDays = (metroMonth.passengersLakh * 1e5) / new Date(+metroMonth.month.slice(0, 4), +metroMonth.month.slice(5, 7), 0).getDate()
    out.monthly.push(seg(`An average ${fmtDate(`${metroMonth.month}-01`, { month: 'long' })} day carried ${fmtInt(allDays)}, `,
      warn(`${Math.abs(pctChange(allDays, metroAvg.avg)).toFixed(1)}% below the reported weekday average`), ` (${fmtInt(metroAvg.avg)}), so weekends and holidays must be lighter — spare capacity there could be filled with off-peak offers.`))
  }

  // --- yearly: growth path, compounding, fares vs volume
  const fy = tr.fy, yoy = fy.slice(1).map((y) => y.tripsChange)
  if (yoy.length >= 2) {
    const slowing = yoy.every((v, i) => i === 0 || v < yoy[i - 1])
    out.yearly.push(seg(`Year-on-year trip growth: ${yoy.map((v) => fmtPct(v)).join(' → ')}. `,
      slowing ? warn('Growth is slowing as the network matures') : good('Growth is holding up'), yoy.at(-1) >= 10 ? ', but it is still double-digit.' : '.'))
    const yrs = fy.length - 1, cagr = (Math.pow(fy.at(-1).passengersLakh / fy[0].passengersLakh, 1 / yrs) - 1) * 100
    out.yearly.push(seg(`Over ${yrs} years trips grew from ${fy[0].passengersLakh} to ${fy.at(-1).passengersLakh} lakh — `, good(`${(fy.at(-1).passengersLakh / fy[0].passengersLakh).toFixed(1)}×, or ${cagr.toFixed(1)}% a year compounded`), '.'))
  }
  const fares = fy.map((y) => y.avgFare), last = fy.at(-1)
  out.yearly.push(seg(`Average fare stayed between ₹${Math.min(...fares).toFixed(2)} and ₹${Math.max(...fares).toFixed(2)}, and last year revenue grew ${fmtPct(last.revChange)} against trips ${fmtPct(last.tripsChange)} — `,
    good('revenue growth comes from more riders, not higher fares'), '.'))
  const ad = tr.avgDaily
  if (ad.length >= 2) out.yearly.push(seg(`Average daily ridership went from ${fmtInt(ad[0].riders)} (${ad[0].year}) to ${fmtInt(ad.at(-1).riders)} (${ad.at(-1).year}) — `, good(`${(ad.at(-1).riders / ad[0].riders).toFixed(1)}×`), '.'))

  // --- gaps: how much of the picture is missing, and who can close it
  const metrics = Object.values(o).flatMap((op) => [op.ridersKind === 'day', op.revenueKind !== 'none', op.otpPct != null])
  const have = metrics.filter(Boolean).length
  out.gaps.push(seg(`Only `, have < metrics.length ? warn(`${have} of ${metrics.length}`) : good(`${have} of ${metrics.length}`), ` core daily metrics (riders, revenue, on-time for each operator) are available.`))
  const worst = Object.values(o).map((op) => ({ op, n: a.gaps.filter((g) => g.startsWith(`${op.label}:`)).length })).sort((x, y) => y.n - x.n)[0]
  if (worst?.n) out.gaps.push(seg(`${worst.op.label} accounts for ${worst.n} of the ${a.gaps.length} gaps — `, bad(`a daily MIS from ${worst.op.label} would close most of the blind spots`), '.'))
  return out
}

// ---------- rule-based brief (offline-safe) ----------
// Returns an array of segments: { t: text, tone?: 'bad' | 'good' | 'warn' }
export function ruleBrief(ds, a, today) {
  const o = ds.operators
  const seg = []
  const p = (t, tone) => seg.push({ t, tone })

  p(`Brief for ${fmtDate(ds.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}. `)
  const missing = Object.values(o).filter((op) => op.riders == null).map((op) => op.label)
  p(`The ${missing.length ? 'reporting operators' : 'three operators'} moved ${fmtInt(a.totalRiders)} passengers`)
  p(o.BRTS.ridersKind === 'average' ? ` (BRTS counted at its published average of ${fmtInt(o.BRTS.riders)}). ` : '. ')
  if (missing.length) p(`${missing.join(' and ')} published no figures for this day, so the total is incomplete. `, 'bad')

  if (o.AMTS.riders != null) {
    p(`AMTS carried ${fmtInt(o.AMTS.riders)} riders (${a.share.AMTS?.toFixed(1)}% of the system)`)
    if (o.AMTS.highlight) p(` — ${o.AMTS.highlight.toLowerCase()}`, 'good')
    if (o.AMTS.revenueRs) p(`, collecting ${fmtRs(o.AMTS.revenueRs)}`)
    p('. ')
  }

  if (o.METRO.riders != null) {
    p(`Metro recorded ${fmtInt(o.METRO.riders)} journeys`)
    if (a.metroDod != null) p(`, ${fmtPct(a.metroDod)} vs ${fmtDate(a.metroPrev.date, { day: 'numeric', month: 'short' })}`, a.metroDod < 0 ? 'bad' : 'good')
    if (a.seriesMax?.date === ds.date && o.METRO.series.length > 2) p(' — the highest day in the published series', 'good')
    p(`; punctuality ${o.METRO.otpPct ?? '—'}%. `)
  }

  if (a.refWeather) {
    p(`Rainfall was ${a.refWeather.rainMm} mm (max ${a.refWeather.tMax}°C)`, a.refWeather.rainMm >= 20 ? 'warn' : undefined)
    p('. ')
  }
  if (a.wettest && a.wettest.w.rainMm >= 20) {
    p(`Weather correlation: on the wettest published day (${fmtDate(a.wettest.date, { day: 'numeric', month: 'short' })}, ${a.wettest.w.rainMm} mm) Metro ridership was `)
    p(`${fmtPct(a.wettestVsAvg)} vs the series average`, a.wettestVsAvg < 0 ? 'bad' : 'good')
    p(` (r = ${a.rainR?.toFixed(2)} across ${a.paired.length} days) — Metro demand is largely rain-resilient. `)
  }

  p(`Metro FY Oct25–Sep26 traffic grew ${fmtPct(a.fyGrowth)} and fare revenue ${fmtPct(a.fyRevGrowth)} year-on-year. `, 'good')

  for (const inc of ds.incidents) {
    p(`Disruption (${fmtDate(inc.date, { day: 'numeric', month: 'short' })}, ${inc.operators.join('/')}): ${inc.title}. `, 'bad')
  }
  if (today) {
    p(`Today's outlook (${fmtDate(today.date, { day: 'numeric', month: 'short' })}): ${today.rainMm} mm rain forecast, ${today.rainProb}% chance, max ${today.tMax}°C. `, today.rainProb >= 60 ? 'warn' : undefined)
  }
  if (a.gaps.length) p(`Data gaps: ${a.gaps.join('; ')}.`, 'warn')
  return seg
}

// ---------- WhatsApp briefs ----------
export function ministryWhatsApp(ds, a, today) {
  const o = ds.operators
  const L = []
  L.push(`*🚇 Ahmedabad Unified Transit Brief*`)
  L.push(`_${fmtDate(ds.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}_`)
  L.push('')
  L.push(`*System ridership:* ${fmtInt(a.totalRiders)}${o.BRTS.ridersKind === 'average' ? ' (BRTS at published avg)' : ''}`)
  const line = (icon, k, extra) => L.push(o[k].riders == null ? `• ${icon} ${o[k].label}: _not published for this day_` : `• ${icon} ${o[k].label}: ${fmtInt(o[k].riders)} (${a.share[k]?.toFixed(0)}%)${extra}`)
  line('🚌', 'AMTS', o.AMTS.revenueRs ? ` · ${fmtRs(o.AMTS.revenueRs)}` : '')
  line('🚇', 'METRO', a.metroDod != null ? ` · ${fmtPct(a.metroDod)} DoD` : '')
  line('🚍', 'BRTS', o.BRTS.ridersKind === 'average' ? ' _avg_' : '')
  L.push('')
  L.push(`*Strategic signals*`)
  if (o.AMTS.highlight) L.push(`✅ AMTS: ${o.AMTS.highlight}`)
  L.push(`📈 Metro FY25-26: ${METRO.yearly[3].passengersLakh} lakh trips (${fmtPct(a.fyGrowth)} YoY), ₹${METRO.yearly[3].revenueCr} cr (${fmtPct(a.fyRevGrowth)})`)
  if (o.METRO.otpPct != null) L.push(`⏱️ Metro punctuality: ${o.METRO.otpPct}%`)
  if (a.wettest && a.wettest.w.rainMm >= 20) L.push(`🌧️ Rain-resilience: ${a.wettest.w.rainMm} mm day → Metro ${fmtPct(a.wettestVsAvg)} vs avg`)
  if (a.gaps.length) {
    L.push('')
    L.push(`*⚠️ Reporting gaps (action: mandate daily MIS)*`)
    a.gaps.forEach((g) => L.push(`• ${g}`))
  }
  if (today) L.push('', `🌤️ Today: ${today.rainMm} mm rain (${today.rainProb}%), ${today.tMax}°C`)
  L.push('', '_Fatafat Brief · sources: GMRC, AMTS, Janmarg, Open-Meteo_')
  return L.join('\n')
}

export function opsWhatsApp(ds, a, today) {
  const o = ds.operators
  const L = []
  L.push(`*🛠️ Ops Exceptions — ${fmtDate(ds.date, { day: 'numeric', month: 'short' })}*`)
  L.push('_Exceptions only. No item = normal._')
  L.push('')
  let n = 0
  for (const inc of ds.incidents) {
    n++
    L.push(`🔴 *${inc.operators.join('/')}* (${fmtDate(inc.date, { day: 'numeric', month: 'short' })}): ${inc.title}`)
    if (inc.detail) L.push(`   ${inc.detail}`)
  }
  if (a.metroDod != null && a.metroDod < -5) {
    n++
    L.push(`🔴 *Metro* ridership ${fmtPct(a.metroDod)} DoD — check station gates/feeders`)
  }
  if (a.refWeather && a.refWeather.rainMm >= 20) {
    n++
    L.push(`🟠 *Rain* ${a.refWeather.rainMm} mm — inspect underpasses on AMTS/BRTS routes`)
  }
  if (today && today.rainProb >= 60) {
    n++
    L.push(`🟠 *Today* ${today.rainProb}% rain chance (${today.rainMm} mm) — pre-position standby buses`)
  }
  for (const [, op] of Object.entries(o)) if (op.stale) { n++; L.push(`🟠 *${op.label}* missing from today's MIS upload`) }
  if (!n) L.push('✅ No operational exceptions.')
  L.push('', `_Data gaps: ${a.gaps.length}_ · Fatafat Brief`)
  return L.join('\n')
}

export function sourceList(ids) {
  return ids.map((id) => (id === 'upload' ? { title: 'Uploaded operator MIS', publisher: 'You', url: null } : SOURCES[id])).filter(Boolean)
}
