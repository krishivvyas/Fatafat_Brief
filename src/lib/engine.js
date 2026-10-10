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
// The default dataset is built purely from published figures. An operator can
// load their own MIS CSV to replace it with the actual previous-day numbers.
export function publishedDataset() {
  const series = METRO.dailySeries
  const ref = series.find((d) => d.date === REFERENCE_DATE)
  const aug = METRO.august2026
  const avgFare = (aug.revenueCr * 1e7) / (aug.passengersLakh * 1e5)
  return {
    date: REFERENCE_DATE,
    origin: 'published',
    operators: {
      METRO: {
        label: 'Metro',
        riders: ref.riders,
        ridersKind: 'day',
        revenueRs: ref.riders * avgFare,
        revenueKind: 'derived',
        revenueNote: `Riders × ₹${avgFare.toFixed(2)} avg fare (Aug 2026: ₹${aug.revenueCr} cr / ${aug.passengersLakh} lakh trips)`,
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
        riders: AMTS.referenceDay.riders,
        ridersKind: 'day',
        revenueRs: AMTS.referenceDay.revenueRs,
        revenueKind: 'day',
        otpPct: null,
        otpNote: 'AMTS does not publish on-time performance',
        series: [],
        facts: [
          ['Buses operated', fmtInt(AMTS.referenceDay.busesOperated)],
          ['Riders per bus', fmtInt(AMTS.referenceDay.riders / AMTS.referenceDay.busesOperated)],
          ['Revenue per rider', `₹${(AMTS.referenceDay.revenueRs / AMTS.referenceDay.riders).toFixed(2)}`],
          ['E-buses on order', fmtInt(AMTS.electricBusesOrdered)],
        ],
        highlight: AMTS.referenceDay.note,
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

export function datasetFromCsv(text, base) {
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
    return o
  })
  const valid = rows.filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && ['METRO', 'AMTS', 'BRTS'].includes(r.operator.toUpperCase()))
  if (!valid.length) throw new Error('No valid rows (need date YYYY-MM-DD and operator METRO/AMTS/BRTS)')
  const latest = valid.map((r) => r.date).sort().at(-1)
  const ds = structuredClone(base)
  ds.date = latest
  ds.origin = 'uploaded'
  ds.incidents = []
  for (const key of ['METRO', 'AMTS', 'BRTS']) {
    const opRows = valid.filter((r) => r.operator.toUpperCase() === key).sort((a, b) => a.date.localeCompare(b.date))
    const day = opRows.filter((r) => r.date === latest)
    const op = ds.operators[key]
    if (!day.length) {
      op.stale = true
      continue
    }
    const r = day[0]
    const num = (v) => (v === '' || v == null || isNaN(+v) ? null : +v)
    op.riders = num(r.riders)
    op.ridersKind = 'day'
    op.ridersNote = undefined
    op.revenueRs = num(r.revenue_rs)
    op.revenueKind = op.revenueRs == null ? 'none' : 'day'
    op.revenueNote = undefined
    op.otpPct = num(r.on_time_pct)
    op.otpNote = op.otpPct == null ? 'Not provided in upload' : 'From uploaded MIS'
    op.highlight = undefined
    op.sources = ['upload']
    const hist = opRows.map((x) => ({ date: x.date, riders: num(x.riders) })).filter((x) => x.riders != null)
    op.series = hist.length > 1 ? hist : op.series
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
    if (o.ridersKind !== 'day') gaps.push(`${o.label}: no day-level ridership published`)
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

// ---------- rule-based brief (offline-safe) ----------
// Returns an array of segments: { t: text, tone?: 'bad' | 'good' | 'warn' }
export function ruleBrief(ds, a, today) {
  const o = ds.operators
  const seg = []
  const p = (t, tone) => seg.push({ t, tone })

  p(`Brief for ${fmtDate(ds.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}. `)
  p(`The three operators moved ${fmtInt(a.totalRiders)} passengers`)
  p(o.BRTS.ridersKind === 'average' ? ` (BRTS counted at its published average of ${fmtInt(o.BRTS.riders)}). ` : '. ')

  p(`AMTS carried ${fmtInt(o.AMTS.riders)} riders (${a.share.AMTS?.toFixed(1)}% of the system)`)
  if (o.AMTS.highlight) p(` — ${o.AMTS.highlight.toLowerCase()}`, 'good')
  if (o.AMTS.revenueRs) p(`, collecting ${fmtRs(o.AMTS.revenueRs)}`)
  p('. ')

  p(`Metro recorded ${fmtInt(o.METRO.riders)} journeys`)
  if (a.metroDod != null) p(`, ${fmtPct(a.metroDod)} vs ${fmtDate(a.metroPrev.date, { day: 'numeric', month: 'short' })}`, a.metroDod < 0 ? 'bad' : 'good')
  if (a.seriesMax?.date === ds.date && o.METRO.series.length > 2) p(' — the highest day in the published series', 'good')
  p(`; punctuality ${o.METRO.otpPct ?? '—'}%. `)

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
  L.push(`• 🚌 AMTS: ${fmtInt(o.AMTS.riders)} (${a.share.AMTS?.toFixed(0)}%)${o.AMTS.revenueRs ? ` · ${fmtRs(o.AMTS.revenueRs)}` : ''}`)
  L.push(`• 🚇 Metro: ${fmtInt(o.METRO.riders)} (${a.share.METRO?.toFixed(0)}%)${a.metroDod != null ? ` · ${fmtPct(a.metroDod)} DoD` : ''}`)
  L.push(`• 🚍 BRTS: ${fmtInt(o.BRTS.riders)} (${a.share.BRTS?.toFixed(0)}%)${o.BRTS.ridersKind === 'average' ? ' _avg_' : ''}`)
  L.push('')
  L.push(`*Strategic signals*`)
  if (o.AMTS.highlight) L.push(`✅ AMTS: ${o.AMTS.highlight}`)
  L.push(`📈 Metro FY25-26: ${METRO.yearly[3].passengersLakh} lakh trips (${fmtPct(a.fyGrowth)} YoY), ₹${METRO.yearly[3].revenueCr} cr (${fmtPct(a.fyRevGrowth)})`)
  L.push(`⏱️ Metro punctuality: ${o.METRO.otpPct}%`)
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
