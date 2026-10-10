import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import {
  TrainFront, Bus, BusFront, Users, IndianRupee, CloudRain, Sparkles, WifiOff, Wifi, MessageCircle,
  ClipboardList, X, Copy, Check, Upload, Download, KeyRound, ExternalLink, AlertTriangle, RefreshCw, Database, Info, FileText, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { SOURCES, METRO } from './data/published.js'
import {
  publishedDataset, availableDates, parseMisCsv, datasetFromRows, analyse, ruleBrief, ministryWhatsApp, opsWhatsApp, sourceList, CSV_TEMPLATE,
  fetchWeatherArchive, fetchTodayForecast, weatherSnapshot, fmtInt, fmtRs, fmtPct, fmtDate,
} from './lib/engine.js'
import { aiBrief, PROVIDERS } from './lib/ai.js'
import { INDIGO, SLATE, shortDate, Card, KindBadge, ChartTip, Segments } from './ui.jsx'
import Report from './Report.jsx'

// ---------------- small building blocks ----------------
function Sparkline({ data, dataKey, type = 'line', unit }) {
  return (
    <div className="h-12 w-full">
      <ResponsiveContainer>
        {type === 'line' ? (
          <LineChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
            <XAxis dataKey="label" hide />
            <YAxis hide domain={['dataMin', 'dataMax']} />
            <Tooltip content={<ChartTip unit={unit} />} cursor={{ stroke: SLATE, strokeDasharray: 3 }} />
            <Line isAnimationActive={false} type="monotone" dataKey={dataKey} stroke={INDIGO} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: 2 }} barCategoryGap={2}>
            <XAxis dataKey="label" hide />
            <Tooltip content={<ChartTip unit={unit} />} cursor={{ fill: '#eef2ff' }} />
            <Bar isAnimationActive={false} dataKey={dataKey} fill={INDIGO} radius={[3, 3, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, sub, badge, children }) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500"><Icon className="h-4 w-4 text-indigo-600" />{label}</div>
        {badge}
      </div>
      <div className="text-3xl font-semibold tracking-tight text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{sub}</div>
      {children}
    </Card>
  )
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white shadow-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function WhatsAppModal({ title, text, onClose }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <Modal title={title} onClose={onClose}>
      <pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap rounded-lg bg-[#e7ffdb] p-4 font-sans text-sm leading-6 text-slate-800">{text}</pre>
      <div className="mt-4 flex gap-2">
        <button onClick={copy} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copied' : 'Copy text'}
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <MessageCircle className="h-4 w-4" />Open WhatsApp
        </a>
      </div>
    </Modal>
  )
}

function SettingsModal({ provider, keys, onSave, onClose }) {
  const [p, setP] = useState(provider)
  const [k, setK] = useState(keys)
  const meta = PROVIDERS[p]
  return (
    <Modal title="GenAI settings" onClose={onClose}>
      <label className="text-sm font-medium text-slate-700">AI engine</label>
      <div className="mt-1 grid grid-cols-2 gap-2">
        {Object.entries(PROVIDERS).map(([id, m]) => (
          <button key={id} onClick={() => setP(id)}
            className={`rounded-lg border px-3 py-2 text-left text-sm ${p === id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
            <div className="font-medium">{m.label}</div><div className="text-[11px] text-slate-500">{m.model}</div>
          </button>
        ))}
      </div>
      <label className="mt-4 block text-sm font-medium text-slate-700">{meta.label} API key</label>
      <input type="password" value={k[p] ?? ''} onChange={(e) => setK({ ...k, [p]: e.target.value })} placeholder={meta.keyHint}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none" />
      <p className="mt-2 text-xs text-slate-500">
        Get a key: <a href={meta.keyUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{new URL(meta.keyUrl).host}</a>.
        Stored only in this browser (localStorage). Without a key, the brief uses the rule engine.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        {k[p] && <button onClick={() => setK({ ...k, [p]: '' })} className="rounded-lg px-4 py-2 text-sm text-red-600 hover:bg-red-50">Clear key</button>}
        <button onClick={() => { onSave(p, Object.fromEntries(Object.entries(k).map(([a, b]) => [a, (b ?? '').trim()]))); onClose() }} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Save</button>
      </div>
    </Modal>
  )
}

function SourceLinks({ ids }) {
  return (
    <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 pt-3">
      {sourceList(ids).map((s, i) =>
        s.url ? (
          <a key={i} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline">
            {s.publisher}<ExternalLink className="h-3 w-3" />
          </a>
        ) : <span key={i} className="text-[11px] text-slate-500">{s.title}</span>,
      )}
    </div>
  )
}

const OP_ICON = { METRO: TrainFront, AMTS: Bus, BRTS: BusFront }

function OperatorCard({ id, op, share }) {
  const Icon = OP_ICON[id]
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><div className="rounded-lg bg-indigo-50 p-2"><Icon className="h-5 w-5 text-indigo-600" /></div><h3 className="font-semibold text-slate-900">{op.label}</h3></div>
        <span className="text-xs text-slate-500">{share != null ? `${share.toFixed(1)}% share` : ''}</span>
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex items-start justify-between gap-2">
          <dt className="text-slate-500">Ridership</dt>
          <dd className="text-right"><div className="font-semibold text-slate-900">{fmtInt(op.riders)}</div><KindBadge kind={op.ridersKind} title={op.ridersNote} /></dd>
        </div>
        <div className="flex items-start justify-between gap-2">
          <dt className="text-slate-500">Revenue</dt>
          <dd className="text-right"><div className="font-semibold text-slate-900">{op.revenueRs == null ? 'Not published' : fmtRs(op.revenueRs)}</div><KindBadge kind={op.revenueKind} title={op.revenueNote} /></dd>
        </div>
        <div className="flex items-start justify-between gap-2">
          <dt className="text-slate-500">On-time</dt>
          <dd className="text-right"><div className={`font-semibold ${op.otpPct == null ? 'text-slate-400' : 'text-slate-900'}`}>{op.otpPct == null ? 'Not published' : `${op.otpPct}%`}</div><div className="text-[10px] text-slate-400">{op.otpNote}</div></dd>
        </div>
        {op.facts.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2 border-t border-slate-100 pt-2"><dt className="text-slate-500">{k}</dt><dd className="text-right text-slate-700">{v}</dd></div>
        ))}
      </dl>
      {op.ridersNote && <p className="mt-3 flex gap-1 text-[11px] text-slate-500"><Info className="mt-0.5 h-3 w-3 shrink-0" />{op.ridersNote}</p>}
      {op.revenueNote && <p className="mt-1 flex gap-1 text-[11px] text-slate-500"><Info className="mt-0.5 h-3 w-3 shrink-0" />{op.revenueNote}</p>}
      {op.stale && <p className="mt-2 flex gap-1 text-[11px] text-red-600"><AlertTriangle className="h-3 w-3" />{op.riders == null ? 'Not in uploaded MIS for this day' : 'Not in uploaded MIS — showing published figures'}</p>}
      <SourceLinks ids={op.sources} />
    </Card>
  )
}

const OP_LABEL = { METRO: 'Metro', AMTS: 'AMTS', BRTS: 'BRTS' }

// Only dates that have data are offered; list is newest first.
function DatePicker({ dates, value, onChange }) {
  const i = dates.findIndex((d) => d.date === value)
  const btn = 'rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent'
  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      <button onClick={() => onChange(dates[i + 1].date)} disabled={i >= dates.length - 1} className={btn} title="Previous day with data" aria-label="Previous day"><ChevronLeft className="h-4 w-4" /></button>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Reporting day"
        className="rounded-md border border-slate-300 bg-white py-0.5 pl-2 pr-1 text-sm font-medium text-slate-700 focus:border-indigo-500 focus:outline-none">
        {dates.map((d) => (
          <option key={d.date} value={d.date}>
            {fmtDate(d.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · {d.operators.length ? d.operators.map((k) => OP_LABEL[k]).join(' + ') : 'no day figures'}
          </option>
        ))}
      </select>
      <button onClick={() => onChange(dates[i - 1].date)} disabled={i <= 0} className={btn} title="Next day with data" aria-label="Next day"><ChevronRight className="h-4 w-4" /></button>
    </span>
  )
}

// ---------------- app ----------------
export default function App() {
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [browserOnline, setBrowserOnline] = useState(navigator.onLine)
  const [provider, setProvider] = useState(() => localStorage.getItem('fatafat.provider') ?? 'gemini')
  const [keys, setKeys] = useState(() => ({ gemini: localStorage.getItem('fatafat.key.gemini') ?? import.meta.env.VITE_GEMINI_API_KEY ?? '', claude: localStorage.getItem('fatafat.key.claude') ?? '' }))
  const apiKey = keys[provider]
  const [uploadRows, setUploadRows] = useState(null)
  const dates = useMemo(() => availableDates(uploadRows), [uploadRows])
  const [date, setDate] = useState(() => publishedDataset().date)
  const dataset = useMemo(() => (uploadRows ? datasetFromRows(uploadRows, date) : publishedDataset(date)), [uploadRows, date])
  const [weather, setWeather] = useState(weatherSnapshot)
  const [today, setToday] = useState(null)
  const [liveReady, setLiveReady] = useState(false)
  const [brief, setBrief] = useState({ segs: [], engine: 'rule', note: '' })
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null)
  const [uploadErr, setUploadErr] = useState('')
  const fileRef = useRef(null)
  const closeModal = useCallback(() => setModal(null), [])

  const saveSettings = (p, k) => {
    setProvider(p); setKeys(k)
    localStorage.setItem('fatafat.provider', p)
    for (const [id, v] of Object.entries(k)) v ? localStorage.setItem(`fatafat.key.${id}`, v) : localStorage.removeItem(`fatafat.key.${id}`)
  }
  const online = browserOnline && !isOfflineMode

  useEffect(() => {
    const on = () => setBrowserOnline(true), off = () => setBrowserOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // Live weather when online; cached real snapshot when offline.
  useEffect(() => {
    if (!online) { setWeather(weatherSnapshot()); setToday(null); setLiveReady(true); return }
    setLiveReady(false)
    const ctl = new AbortController()
    const series = dataset.operators.METRO.series
    const start = [series[0]?.date, dataset.date].filter(Boolean).sort()[0]
    const s = new Date(`${start}T00:00:00Z`); s.setUTCDate(s.getUTCDate() - 3)
    const e = new Date(`${dataset.date}T00:00:00Z`); e.setUTCDate(e.getUTCDate() + 2)
    Promise.allSettled([
      fetchWeatherArchive(s.toISOString().slice(0, 10), e.toISOString().slice(0, 10), ctl.signal).then(setWeather).catch(() => setWeather(weatherSnapshot())),
      fetchTodayForecast(ctl.signal).then(setToday).catch(() => setToday(null)),
    ]).then(() => !ctl.signal.aborted && setLiveReady(true))
    return () => ctl.abort()
  }, [online, dataset])

  const analysis = useMemo(() => analyse(dataset, weather), [dataset, weather])

  const generateBrief = useCallback(async () => {
    const rule = ruleBrief(dataset, analysis, today)
    if (!online) { setBrief({ segs: rule, engine: 'offline', note: 'Network unavailable — rule-based generator (instant)' }); return }
    if (!apiKey) { setBrief({ segs: rule, engine: 'rule', note: `No ${PROVIDERS[provider].label} key set — rule-based generator` }); return }
    setLoading(true)
    try {
      const segs = await aiBrief({ provider, apiKey, dataset, analysis, today })
      setBrief({ segs, engine: 'ai', note: `${PROVIDERS[provider].label} (${PROVIDERS[provider].model}) · grounded only on the figures shown on this page` })
    } catch (err) {
      setBrief({ segs: rule, engine: 'fallback', note: `GenAI unavailable (${err.message}) — fell back to rule engine` })
    } finally {
      setLoading(false)
    }
  }, [dataset, analysis, today, online, apiKey, provider])

  // Wait for live inputs so one brief (and at most one AI call) is produced per change.
  useEffect(() => { if (liveReady) generateBrief() }, [liveReady, generateBrief])

  const onUpload = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const rows = parseMisCsv(await f.text())
      setUploadRows(rows); setDate(availableDates(rows)[0].date); setUploadErr('')
    }
    catch (err) { setUploadErr(err.message) }
    e.target.value = ''
  }
  const downloadTemplate = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: 'text/csv' }))
    a.download = 'fatafat-daily-mis-template.csv'
    a.click()
  }

  const o = dataset.operators
  const metroSpark = o.METRO.series.map((d) => ({ label: shortDate(d.date), riders: d.riders }))
  const revSpark = METRO.yearly.map((y) => ({ label: y.period.replace('FY ', ''), revenue: y.revenueCr * 1e7 }))
  const rainSpark = weather.daily.time.map((t, i) => ({ label: shortDate(t), rain: weather.daily.precipitation_sum[i] }))
  const paired = analysis.paired.map((d) => ({ label: shortDate(d.date), riders: d.riders, rain: d.w.rainMm }))

  const engineBadge = {
    ai: ['bg-indigo-50 text-indigo-700', Sparkles, provider === 'gemini' ? 'Gemini' : 'Claude'],
    rule: ['bg-slate-100 text-slate-600', ClipboardList, 'Rule engine'],
    offline: ['bg-amber-50 text-amber-700', WifiOff, 'Offline mode'],
    fallback: ['bg-amber-50 text-amber-700', AlertTriangle, 'Fallback'],
  }[brief.engine]
  const EngineIcon = engineBadge[1]

  return (
    <>
    <div className={`min-h-screen bg-slate-50 text-slate-900 ${modal === 'report' ? 'print:hidden' : ''}`}>
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Fatafat <span className="text-indigo-600">Brief</span> <span className="text-sm font-normal text-slate-500">· Unified Morning Brief for Ahmedabad transit</span></h1>
            <p className="text-sm text-slate-500">
              {fmtDate(new Date().toISOString().slice(0, 10), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' · '}Reporting day <DatePicker dates={dates} value={dataset.date} onChange={setDate} />
              {dataset.origin === 'published' ? ' published figures' : ' uploaded MIS'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setModal('settings')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
              <KeyRound className="h-4 w-4" />{apiKey ? `${PROVIDERS[provider].label.split(' ')[1]} key set` : 'Add AI key'}
            </button>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              {online ? <Wifi className="h-4 w-4 text-emerald-600" /> : <WifiOff className="h-4 w-4 text-amber-600" />}
              Simulate Network Drop
              <button role="switch" aria-checked={isOfflineMode} onClick={() => setIsOfflineMode((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition ${isOfflineMode ? 'bg-amber-500' : 'bg-slate-300'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${isOfflineMode ? 'left-5' : 'left-0.5'}`} />
              </button>
            </label>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {/* KPIs */}
        <section className="grid gap-6 md:grid-cols-3">
          <Kpi icon={Users} label="System Ridership" value={fmtInt(analysis.totalRiders)}
            sub={`Metro ${fmtInt(o.METRO.riders)} · AMTS ${fmtInt(o.AMTS.riders)} · BRTS ${fmtInt(o.BRTS.riders)}${o.BRTS.ridersKind === 'average' ? ' (avg)' : ''}`}
            badge={<KindBadge kind={o.BRTS.ridersKind === 'average' ? 'average' : 'day'} title="Includes BRTS published average" />}>
            <Sparkline data={metroSpark} dataKey="riders" />
            <div className="text-[11px] text-slate-400">Metro daily journeys, {metroSpark.length} published days {analysis.metroDod != null && <span className={analysis.metroDod < 0 ? 'text-red-600' : 'text-emerald-600'}>· {fmtPct(analysis.metroDod)} DoD</span>}</div>
          </Kpi>
          <Kpi icon={IndianRupee} label="Total Revenue" value={fmtRs(analysis.revenueReported + analysis.revenueDerived)}
            sub={Object.values(o).map((op) => `${op.label} ${op.revenueRs == null ? 'not published' : `${fmtRs(op.revenueRs)}${op.revenueKind === 'derived' ? ' derived' : ' reported'}`}`).join(' · ')}
            badge={<KindBadge kind={analysis.revenueDerived ? 'derived' : 'day'} title="Metro revenue derived from published average fare" />}>
            <Sparkline data={revSpark} dataKey="revenue" type="bar" />
            <div className="text-[11px] text-slate-400">Metro annual fare revenue, FY23→FY26 <span className="text-emerald-600">· {fmtPct(analysis.fyRevGrowth)} YoY</span></div>
          </Kpi>
          <Kpi icon={CloudRain} label="Weather & Reliability"
            value={analysis.refWeather ? `${analysis.refWeather.rainMm} mm` : '—'}
            sub={`Rain on reporting day · Metro punctuality ${o.METRO.otpPct ?? '—'}% · rain↔ridership r = ${analysis.rainR?.toFixed(2) ?? '—'}`}
            badge={<span className={`text-[10px] font-medium ${weather.live ? 'text-emerald-600' : 'text-amber-600'}`}>{weather.live ? '● Live API' : `● Cached ${weather.fetchedAt}`}</span>}>
            <Sparkline data={rainSpark} dataKey="rain" type="bar" unit=" mm" />
            <div className="text-[11px] text-slate-400">Daily rainfall, Ahmedabad (Open-Meteo ERA5)</div>
          </Kpi>
        </section>

        {/* Executive Synthesis */}
        <Card className="border-indigo-100 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Executive Synthesis</h2>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${engineBadge[0]}`}><EngineIcon className="h-3.5 w-3.5" />{engineBadge[2]}</span>
              <button onClick={generateBrief} disabled={loading} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40" title="Regenerate"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>
          </div>
          <div className="mt-4 min-h-28">
            {loading ? (
              <div className="space-y-3 animate-pulse">{[100, 95, 98, 70].map((w, i) => <div key={i} className="h-3 rounded bg-slate-200" style={{ width: `${w}%` }} />)}<p className="text-xs text-slate-400">Synthesising across Metro, AMTS, BRTS and weather…</p></div>
            ) : <Segments segs={brief.segs} />}
          </div>
          <p className="mt-3 text-xs text-slate-400">{brief.note}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <button onClick={() => setModal('ministry')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
              <MessageCircle className="h-4 w-4" />Generate Ministry WhatsApp Brief
            </button>
            <button onClick={() => setModal('ops')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700 hover:bg-indigo-100">
              <ClipboardList className="h-4 w-4" />Generate Ops Team Brief
            </button>
            <button onClick={() => setModal('report')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <FileText className="h-4 w-4" />Full Report &amp; Trends
            </button>
          </div>
        </Card>

        {/* Operator breakdown */}
        <section className="grid gap-6 md:grid-cols-3">
          {['METRO', 'AMTS', 'BRTS'].map((k) => <OperatorCard key={k} id={k} op={o[k]} share={analysis.share[k]} />)}
        </section>

        {/* Correlation + incidents */}
        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <h3 className="font-semibold">Metro ridership vs rainfall</h3>
            <p className="text-xs text-slate-500">Same days, two panels (no dual axis). Ridership: GMRC via DeshGujarat. Rain: Open-Meteo.</p>
            <div className="mt-4 h-44">
              <ResponsiveContainer>
                <LineChart data={paired} syncId="corr" margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis domain={['dataMin - 2000', 'dataMax + 2000']} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<ChartTip unit=" journeys" />} />
                  <Line isAnimationActive={false} type="monotone" dataKey="riders" stroke={INDIGO} strokeWidth={2} dot={{ r: 4, fill: INDIGO, stroke: '#fff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-24">
              <ResponsiveContainer>
                <BarChart data={paired} syncId="corr" margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                  <XAxis dataKey="label" hide />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={40} unit="mm" />
                  <Tooltip content={<ChartTip unit=" mm rain" />} cursor={{ fill: '#eef2ff' }} />
                  <Bar isAnimationActive={false} dataKey="rain" fill={SLATE} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {analysis.wettest && (
              <p className="mt-2 text-xs text-slate-600">Wettest published day: <b>{shortDate(analysis.wettest.date)}</b> ({analysis.wettest.w.rainMm} mm) → {fmtInt(analysis.wettest.riders)} journeys, <span className={analysis.wettestVsAvg < 0 ? 'text-red-600' : 'text-emerald-600'}>{fmtPct(analysis.wettestVsAvg)}</span> vs average. Pearson r = {analysis.rainR?.toFixed(2)}.</p>
            )}
          </Card>
          <Card>
            <h3 className="font-semibold">Published disruptions</h3>
            <ul className="mt-3 space-y-3">
              {dataset.incidents.length === 0 && <li className="text-sm text-slate-500">None reported.</li>}
              {dataset.incidents.map((inc, i) => (
                <li key={i} className="rounded-lg border border-red-100 bg-red-50/50 p-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-red-700"><AlertTriangle className="h-3.5 w-3.5" />{inc.operators.join(' · ')} · {shortDate(inc.date)}</div>
                  <div className="mt-1 text-sm font-medium text-slate-800">{inc.title}</div>
                  {inc.detail && <div className="mt-1 text-xs leading-5 text-slate-600">{inc.detail}</div>}
                  {SOURCES[inc.source] && <a href={SOURCES[inc.source].url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline">{SOURCES[inc.source].publisher}<ExternalLink className="h-3 w-3" /></a>}
                </li>
              ))}
            </ul>
            <h3 className="mt-6 font-semibold">Data gaps</h3>
            <ul className="mt-2 space-y-1">
              {analysis.gaps.map((g) => <li key={g} className="flex gap-1.5 text-xs text-amber-800"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{g}</li>)}
            </ul>
          </Card>
        </section>

        {/* Data source panel */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Database className="h-5 w-5 text-indigo-600" /><h3 className="font-semibold">Data source</h3>
              <span className="text-xs text-slate-500">{dataset.origin === 'published' ? 'Publicly published operator figures (no simulated data)' : 'Uploaded operator MIS'}</span></div>
            <div className="flex gap-2">
              <button onClick={downloadTemplate} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" />CSV template</button>
              <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"><Upload className="h-4 w-4" />Load daily MIS</button>
              {dataset.origin === 'uploaded' && <button onClick={() => { setUploadRows(null); setDate(publishedDataset().date) }} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">Reset to published</button>}
              <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onUpload} />
            </div>
          </div>
          {uploadErr && <p className="mt-2 text-sm text-red-600">{uploadErr}</p>}
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {Object.values(SOURCES).map((s) => (
              <li key={s.url} className="text-xs"><a href={s.url} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 hover:underline">{s.title}</a><span className="text-slate-500"> — {s.publisher}, {s.date}</span></li>
            ))}
          </ul>
        </Card>
      </main>

      {modal === 'ministry' && <WhatsAppModal title="Ministry WhatsApp Brief" text={ministryWhatsApp(dataset, analysis, today)} onClose={() => setModal(null)} />}
      {modal === 'ops' && <WhatsAppModal title="Ops Team Brief (exceptions only)" text={opsWhatsApp(dataset, analysis, today)} onClose={() => setModal(null)} />}
      {modal === 'settings' && <SettingsModal provider={provider} keys={keys} onSave={saveSettings} onClose={() => setModal(null)} />}
    </div>
    {modal === 'report' && <Report dataset={dataset} analysis={analysis} weather={weather} brief={brief} onClose={closeModal} />}
    </>
  )
}
