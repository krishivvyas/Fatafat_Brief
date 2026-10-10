import { useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Printer, X, AlertTriangle, Info } from 'lucide-react'
import { SOURCES } from './data/published.js'
import { trends, fmtInt, fmtRs, fmtPct, fmtDate } from './lib/engine.js'
import { INDIGO, SLATE, shortDate, KindBadge, ChartTip, Segments } from './ui.jsx'

const monthName = (m) => fmtDate(`${m}-01`, { month: 'long', year: 'numeric' })
const daysInMonth = (m) => new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate()
const lakh = (v) => v.toFixed(2)
const axis = { tick: { fontSize: 11, fill: '#64748b' }, axisLine: false, tickLine: false }

function Section({ id, n, title, sub, children }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-slate-200 pt-6 break-inside-avoid-page">
      <h2 className="text-lg font-semibold text-slate-900"><span className="mr-2 text-indigo-600">{n}.</span>{title}</h2>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  )
}

function Table({ head, rows }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
          {head.map((h, i) => <th key={i} className={`py-1.5 font-medium ${i ? 'text-right' : ''}`}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-slate-100 break-inside-avoid">
            {r.map((c, j) => <td key={j} className={`py-1.5 tabular-nums ${j ? 'text-right' : 'text-slate-700'}`}>{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Delta({ v }) {
  if (v == null) return <span className="text-slate-400">—</span>
  return <span className={v < 0 ? 'text-red-600' : 'text-emerald-600'}>{fmtPct(v)}</span>
}

const Note = ({ children }) => <p className="flex gap-1.5 text-xs text-slate-500"><Info className="mt-0.5 h-3 w-3 shrink-0" />{children}</p>

function Bars({ data, x, y, unit, fmt, height = 'h-44' }) {
  return (
    <div className={height}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey={x} {...axis} />
          <YAxis {...axis} width={44} tickFormatter={fmt} />
          <Tooltip content={<ChartTip unit={unit} fmt={fmt} />} cursor={{ fill: '#eef2ff' }} />
          <Bar isAnimationActive={false} dataKey={y} fill={INDIGO} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function Report({ dataset, analysis, weather, brief, onClose }) {
  const t = useMemo(() => trends(dataset, weather), [dataset, weather])
  const o = dataset.operators
  const [generatedAt] = useState(() => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }))

  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const noDaily = Object.entries(o).filter(([k]) => !t.daily[k])

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-slate-100 print:static print:overflow-visible print:bg-white">
      {/* Toolbar (screen only) */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-6 py-3">
          <nav className="flex gap-1 text-sm">
            {[['summary', 'Summary'], ['daily', 'Daily'], ['monthly', 'Monthly'], ['yearly', 'Yearly']].map(([id, label]) => (
              <a key={id} href={`#${id}`} className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100">{label}</a>
            ))}
          </nav>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
              <Printer className="h-4 w-4" />Print / Save PDF
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close report"><X className="h-5 w-5" /></button>
          </div>
        </div>
      </div>

      <article className="mx-auto my-6 max-w-3xl space-y-8 rounded-xl bg-white px-8 py-8 shadow-sm print:my-0 print:rounded-none print:px-0 print:py-0 print:shadow-none">
        <header>
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">Fatafat Brief · Full Report</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Ahmedabad Unified Transit Report</h1>
          <p className="mt-1 text-sm text-slate-600">
            Reporting day <b>{fmtDate(dataset.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</b>
            {' · '}{dataset.origin === 'published' ? 'Publicly published operator figures' : 'Uploaded operator MIS'}
          </p>
          <p className="text-xs text-slate-400">Generated {generatedAt} IST · no simulated data</p>
        </header>

        {/* 1. Summary */}
        <Section id="summary" n={1} title="Executive summary">
          <Segments segs={brief.segs} />
          <p className="text-xs text-slate-400">{brief.note}</p>
          <Table
            head={['Operator', 'Riders', 'Revenue', 'On-time', 'Share']}
            rows={[
              ...Object.entries(o).map(([k, op]) => [
                <span key="l" className="font-medium">{op.label}</span>,
                <span key="r">{fmtInt(op.riders)} <KindBadge kind={op.ridersKind} title={op.ridersNote} /></span>,
                <span key="v">{op.revenueRs == null ? 'Not published' : fmtRs(op.revenueRs)} <KindBadge kind={op.revenueKind} title={op.revenueNote} /></span>,
                op.otpPct == null ? <span key="o" className="text-slate-400">Not published</span> : `${op.otpPct}%`,
                analysis.share[k] != null ? `${analysis.share[k].toFixed(1)}%` : '—',
              ]),
              [<b key="t">System</b>, <b key="tr">{fmtInt(analysis.totalRiders)}</b>, <b key="tv">{fmtRs(analysis.revenueReported + analysis.revenueDerived)}</b>, '', '100%'],
            ]}
          />
        </Section>

        {/* 2. Daily */}
        <Section id="daily" n={2} title="Daily trend" sub="Day-level ridership, compared with the previous reported day. Reported days are not always consecutive.">
          {Object.entries(t.daily).map(([k, rows]) => {
            const chart = rows.map((d) => ({ label: shortDate(d.date), riders: d.riders, rain: d.rainMm }))
            const hasRain = rows.some((d) => d.rainMm != null)
            return (
              <div key={k} className="space-y-3 break-inside-avoid">
                <h3 className="font-medium text-slate-900">{o[k].label} — {rows.length} reported days</h3>
                <div className="h-44">
                  <ResponsiveContainer>
                    <LineChart data={chart} syncId={`d-${k}`} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                      <CartesianGrid stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="label" {...axis} />
                      <YAxis domain={['dataMin - 2000', 'dataMax + 2000']} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} {...axis} width={44} />
                      <Tooltip content={<ChartTip unit=" riders" />} />
                      <Line isAnimationActive={false} type="monotone" dataKey="riders" stroke={INDIGO} strokeWidth={2} dot={{ r: 3, fill: INDIGO, stroke: '#fff', strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {hasRain && (
                  <div className="h-20">
                    <ResponsiveContainer>
                      <BarChart data={chart} syncId={`d-${k}`} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                        <XAxis dataKey="label" hide />
                        <YAxis {...axis} width={44} unit="mm" />
                        <Tooltip content={<ChartTip unit=" mm rain" />} cursor={{ fill: '#eef2ff' }} />
                        <Bar isAnimationActive={false} dataKey="rain" fill={SLATE} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <Table
                  head={['Date', 'Riders', 'vs prev. reported day', 'Rain (mm)']}
                  rows={rows.map((d) => [
                    fmtDate(d.date, { weekday: 'short', day: 'numeric', month: 'short' }),
                    <span key="r" className={d.date === dataset.date ? 'font-semibold' : ''}>{fmtInt(d.riders)}</span>,
                    <Delta key="c" v={d.change} />,
                    d.rainMm ?? '—',
                  ])}
                />
              </div>
            )
          })}
          {t.eventPeaks.length > 0 && (
            <div className="break-inside-avoid">
              <h3 className="mb-2 font-medium text-slate-900">Metro event-day peaks (published)</h3>
              <Table
                head={['Date', 'Event', 'Riders']}
                rows={t.eventPeaks.map((e) => [fmtDate(e.date), e.label, `${e.approx === 'over' ? 'over ' : ''}${fmtInt(e.riders)}`])}
              />
            </div>
          )}
          {noDaily.map(([k, op]) => (
            <Note key={k}>{op.label}: no day-wise series published — {op.ridersKind === 'average' ? `only an average of ${fmtInt(op.riders)}/day` : `one reported day (${fmtInt(op.riders)} riders)`}.</Note>
          ))}
        </Section>

        {/* 3. Monthly */}
        <Section id="monthly" n={3} title="Monthly trend" sub="Published month totals. Average per day is derived: month total ÷ days in month.">
          <div>
            <h3 className="mb-2 font-medium text-slate-900">Metro — published monthly totals</h3>
            <Table
              head={['Month', 'Trips (lakh)', 'vs prev. month', 'Avg/day', 'Revenue']}
              rows={t.metroMonths.map((m) => [
                monthName(m.month),
                lakh(m.passengersLakh),
                <Delta key="c" v={m.change} />,
                <span key="a">{fmtInt((m.passengersLakh * 1e5) / daysInMonth(m.month))} <KindBadge kind="derived" /></span>,
                m.revenueCr == null ? <span key="v" className="text-slate-400">Not published</span> : `₹${m.revenueCr} cr`,
              ])}
            />
          </div>
          {Object.entries(t.monthAvg).map(([k, rows]) => (
            <div key={k}>
              <h3 className="mb-2 font-medium text-slate-900">{o[k].label} — average of reported days <KindBadge kind="derived" /></h3>
              <Table
                head={['Month', 'Reported days', 'Avg riders/day', 'Highest day']}
                rows={rows.map((m) => [monthName(m.month), m.days, fmtInt(m.avg), fmtInt(m.max)])}
              />
            </div>
          ))}
          <Note>AMTS and Janmarg BRTS do not publish monthly ridership or revenue.</Note>
        </Section>

        {/* 4. Yearly */}
        <Section id="yearly" n={4} title="Yearly trend" sub="Metro financial years run October to September (Gujarat Samachar four-year report).">
          <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-slate-700">Trips per FY (lakh)</h3>
              <Bars data={t.fy.map((y) => ({ label: y.period.replace('FY Oct', '').replace('–Sep', '–'), v: y.passengersLakh }))} x="label" y="v" unit=" lakh" fmt={(v) => v.toFixed(0)} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-700">Fare revenue per FY (₹ cr)</h3>
              <Bars data={t.fy.map((y) => ({ label: y.period.replace('FY Oct', '').replace('–Sep', '–'), v: y.revenueCr }))} x="label" y="v" unit=" cr" fmt={(v) => v.toFixed(0)} />
            </div>
          </div>
          <Table
            head={['Year', 'Trips (lakh)', 'YoY', 'Revenue', 'YoY', 'Avg fare']}
            rows={t.fy.map((y) => [
              y.period,
              lakh(y.passengersLakh),
              <Delta key="t" v={y.tripsChange} />,
              `₹${y.revenueCr} cr`,
              <Delta key="r" v={y.revChange} />,
              <span key="f">₹{y.avgFare.toFixed(2)} <KindBadge kind="derived" /></span>,
            ])}
          />
          <div className="break-inside-avoid">
            <h3 className="text-sm font-medium text-slate-700">Metro average daily ridership by year</h3>
            <Bars data={t.avgDaily} x="year" y="riders" unit=" riders/day" fmt={fmtInt} height="h-40" />
            <Table head={['Year', 'Avg riders/day', 'Change']} rows={t.avgDaily.map((y) => [y.year, fmtInt(y.riders), <Delta key="c" v={y.change} />])} />
            <p className="mt-1 text-[11px] text-slate-400">2023–2025 are full-year averages; May 2026 is the year-to-date figure (ThePrint/PTI).</p>
          </div>
          <Note>AMTS and Janmarg BRTS do not publish year-wise ridership; only the figures in the summary are available.</Note>
        </Section>

        {/* 5. Disruptions & gaps */}
        <Section id="gaps" n={5} title="Disruptions and data gaps">
          {dataset.incidents.length === 0 ? <p className="text-sm text-slate-500">No disruptions reported.</p> : (
            <ul className="space-y-2">
              {dataset.incidents.map((inc, i) => (
                <li key={i} className="rounded-lg border border-red-100 bg-red-50/50 p-3 break-inside-avoid">
                  <div className="flex items-center gap-2 text-xs font-medium text-red-700"><AlertTriangle className="h-3.5 w-3.5" />{inc.operators.join(' · ')} · {fmtDate(inc.date)}</div>
                  <div className="mt-1 text-sm font-medium text-slate-800">{inc.title}</div>
                  {inc.detail && <div className="mt-1 text-xs leading-5 text-slate-600">{inc.detail}</div>}
                </li>
              ))}
            </ul>
          )}
          <ul className="space-y-1">
            {analysis.gaps.map((g) => <li key={g} className="flex gap-1.5 text-xs text-amber-800"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{g}</li>)}
          </ul>
        </Section>

        {/* 6. Sources */}
        <Section id="sources" n={6} title="Sources">
          <ol className="list-decimal space-y-1 pl-5 text-xs text-slate-600">
            {dataset.origin === 'uploaded' && <li>Uploaded operator MIS (daily figures for {fmtDate(dataset.date)})</li>}
            {Object.values(SOURCES).map((s) => (
              <li key={s.url}>{s.title} — {s.publisher}, {s.date}. <a href={s.url} className="break-all text-indigo-600 hover:underline">{s.url}</a></li>
            ))}
          </ol>
        </Section>
      </article>
    </div>
  )
}

