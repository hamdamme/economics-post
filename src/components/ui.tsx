import { useState, type ReactNode } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export const fmt = (value: number | null) => value === null ? 'No transactions' : new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(value)
export const colors = ['#00665d', '#9e4228', '#504791', '#2f5d83']
export type PlotRow = Record<string, number | null>
export type Series = { key: string; label: string }

export function Chart({ title, unit, xLabel, rows, series, zero, markers, xKey = 'x' }: {
  title: string; unit: string; xLabel: string; rows: PlotRow[]; series: Series[];
  zero?: boolean; markers?: { x: number; label: string }[]; xKey?: string;
}) {
  return <figure className="chart">
    <figcaption><strong>{title}</strong><span>{unit}</span></figcaption>
    <div className="chart-body">
      <ResponsiveContainer width="100%" height={210} minWidth={0}>
        <LineChart data={rows} margin={{ top: 15, right: 15, bottom: 12, left: 0 }} accessibilityLayer>
          <CartesianGrid vertical={false} stroke="#e4e8dd" />
          <XAxis dataKey={xKey} type="number" domain={['dataMin', 'dataMax']} allowDecimals tickFormatter={fmt} tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} width={57} domain={zero ? [Math.min(0, ...rows.flatMap(row => series.map(s => row[s.key] ?? 0))), Math.max(0, ...rows.flatMap(row => series.map(s => row[s.key] ?? 0)))] : undefined} />
          {zero && <ReferenceLine y={0} stroke="#344642" strokeDasharray="4 3" />}
          {markers?.map(marker => <ReferenceLine key={marker.x} x={marker.x} stroke="#914725" strokeDasharray="2 3" />)}
          <Tooltip labelFormatter={v => `${xLabel} ${v}`} formatter={v => typeof v === 'number' ? fmt(v) : '—'} />
          {series.map((s, i) => <Line key={s.key} type="linear" dataKey={s.key} name={s.label} stroke={colors[i % colors.length]} strokeWidth={2.5}
            strokeDasharray={i === 0 ? undefined : i === 1 ? '7 4' : i === 2 ? '2 4' : '10 4 2 4'} isAnimationActive={false} dot={rows.length === 1 ? { r: 3 } : false} activeDot={{ r: 4 }} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
    <div className="legend">{series.map((s, i) => <span key={s.key}><i style={{ borderColor: colors[i % colors.length], borderTopStyle: i === 0 ? 'solid' : i === 2 ? 'dotted' : 'dashed' }} />{s.label}</span>)}</div>
    <p className="small axis-label">{xLabel}{markers?.length ? ' · Vertical markers identify events or reference values.' : ''}</p>
    {markers?.length ? <details><summary>Timeline markers</summary><ul>{markers.map(m => <li key={m.x}>{xLabel} {m.x} · {m.label}</li>)}</ul></details> : null}
    <details><summary>Read data table</summary><div className="table-scroll"><table><caption className="sr-only">{title} ({unit})</caption><thead><tr><th scope="col">{xLabel}</th>{series.map(s => <th scope="col" key={s.key}>{s.label}</th>)}</tr></thead>
      <tbody>{rows.map((row, i) => <tr key={i}><th scope="row">{fmt(row[xKey])}</th>{series.map(s => <td key={s.key}>{row[s.key] === null ? '—' : fmt(row[s.key])}</td>)}</tr>)}</tbody></table></div></details>
  </figure>
}

export function Heading({ eyebrow, title, children }: { eyebrow?: string; title: string; children: ReactNode }) {
  return <header className="page-heading">{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1><p className="intro">{children}</p></header>
}
export function Metrics({ items }: { items: [string, string][] }) {
  return <dl className="metrics">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
}
export function Range({ label, value, change, min, max, step = 1 }: { label: string; value: number; change: (value: number) => void; min: number; max: number; step?: number }) {
  return <label className="range"><span>{label}<output>{fmt(value)}</output></span><input aria-label={label} type="range" value={value} min={min} max={max} step={step} onChange={e => change(e.target.valueAsNumber)} /></label>
}
export function exportFile(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function exportJson(filename: string, data: unknown) {
  exportFile(filename, JSON.stringify(data, null, 2), 'application/json')
}
export function useLocal<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
  })
  return [value, (next: T) => {
    setValue(next)
    try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* The current tab remains usable. */ }
  }] as const
}
