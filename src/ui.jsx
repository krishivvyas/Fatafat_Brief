import { fmtInt, fmtDate } from './lib/engine.js'

export const INDIGO = '#4f46e5'
export const SLATE = '#94a3b8'
export const shortDate = (d) => fmtDate(d, { day: 'numeric', month: 'short' })

// ---------------- small building blocks ----------------
export function Card({ className = '', children }) {
  return <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 ${className}`}>{children}</div>
}

const KIND_STYLE = {
  day: ['Published (day)', 'bg-emerald-50 text-emerald-700 ring-emerald-200'],
  derived: ['Derived', 'bg-amber-50 text-amber-700 ring-amber-200'],
  average: ['Published avg', 'bg-sky-50 text-sky-700 ring-sky-200'],
  none: ['Not published', 'bg-slate-100 text-slate-500 ring-slate-200'],
}
export function KindBadge({ kind, title }) {
  const [label, cls] = KIND_STYLE[kind] ?? KIND_STYLE.none
  return <span title={title} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${cls}`}>{label}</span>
}

export function ChartTip({ active, payload, label, unit = '', fmt = fmtInt }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white shadow">
      <div className="text-slate-300">{label}</div>
      <div className="font-semibold">{fmt(payload[0].value)}{unit}</div>
    </div>
  )
}

const TONE = {
  bad: 'bg-red-50 text-red-700 rounded px-1',
  good: 'bg-emerald-50 text-emerald-700 rounded px-1',
  warn: 'bg-amber-50 text-amber-800 rounded px-1',
}
export function Segments({ segs }) {
  return (
    <p className="text-[15px] leading-7 text-slate-700">
      {segs.map((s, i) => {
        // also flag any stray negative percentages
        if (!s.tone && /-\d+(\.\d+)?%/.test(s.t)) {
          return s.t.split(/(-\d+(?:\.\d+)?%)/).map((p, j) => (/^-\d/.test(p) ? <span key={`${i}-${j}`} className={TONE.bad}>{p}</span> : p))
        }
        return s.tone ? <span key={i} className={TONE[s.tone]}>{s.t}</span> : <span key={i}>{s.t}</span>
      })}
    </p>
  )
}
