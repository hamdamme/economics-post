import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Chart, Heading, Metrics, exportFile, exportJson, fmt, type PlotRow } from '../components/ui'
import { defaults, fields, parseRecord, run, switches, validate, type Config, type NumericField, type Row, type Run } from '../model/simulation'
import { comparisons } from '../scenarios/presets'
import { Benchmark } from './StaticLabs'

type Measure = { key: keyof Omit<Row, 'firms'>; title: string; unit: string; zero?: boolean }
const measures: Measure[] = [
  { key: 'price', title: 'Transaction price', unit: 'MU per unit' },
  { key: 'quantity', title: 'Market output', unit: 'Units per period' },
  { key: 'active', title: 'Active firms', unit: 'Firms' },
  { key: 'operating', title: 'Operating surplus before setup-cost recovery', unit: 'MU per period', zero: true },
  { key: 'accounting', title: 'Accounting operating profit', unit: 'MU per period', zero: true },
  { key: 'discountedNet', title: 'Cumulative discounted net return', unit: 'MU at period zero', zero: true },
]

function markers(results: Run[], period: number) {
  const byPeriod = new Map<number, Set<string>>()
  for (const r of results) for (const e of r.events) {
    if (e.period > period || e.type === 'decision') continue
    if (!byPeriod.has(e.period)) byPeriod.set(e.period, new Set())
    byPeriod.get(e.period)!.add(e.type === 'shock' ? 'Demand shock' : 'Commitment activated')
  }
  return Array.from(byPeriod, ([x, labels]) => ({ x, label: Array.from(labels).join(', ') })).sort((a, b) => a.x - b.x)
}

function csv(result: Run, period: number) {
  const { firms: omitted, ...sample } = result.rows[0]
  void omitted
  const keys = Object.keys(sample) as (keyof typeof sample)[]
  exportFile('market-timeline.csv', [keys.join(','), ...result.rows.slice(0, period).map(r => keys.map(key => r[key] ?? '').join(','))].join('\n'), 'text/csv')
}

function exportsFor(result: Run, period: number) {
  const record = run({ ...result.config, periods: period })
  return <div className="actions"><button onClick={() => csv(record, period)}>Download timeline CSV</button>
    <button onClick={() => exportJson('market-run.json', record)}>Download run JSON</button>
    <button onClick={() => {
      const rows = record.rows.flatMap(row => row.firms.map(f => [row.period, f.id, f.plant, f.capacity, f.q, f.revenue, f.variableCost, f.accounting, f.economic, f.ownerLabor, f.averageEconomicCost].join(',')))
      exportFile('market-firms.csv', 'period,firm_id,plant,capacity,output,revenue,variable_cost,accounting_profit,operating_surplus,owner_labor,average_economic_cost\n' + rows.join('\n'), 'text/csv')
    }}>Download firm CSV</button>
  </div>
}

function Assumptions() {
  return <details className="panel"><summary>Assumptions, decision rules and limitations</summary>
    <p>Each period applies any disclosed shock, activates earlier commitments, updates both awareness shares, clears the market and records the outcome. Founders commit in ascending ID order before incumbents review resizing and exit. New commitments first affect production in a future period.</p>
    <p>Customer learning can raise the demand intercept. Founder learning identifies which of the 100 potential founders may consider entry. Forecasts hold current demand fixed and account for announced commitments and their delivery dates. Entry requires a positive value after including the entrant’s supply and setup payment.</p>
    <p>Incumbents compare keeping the existing plant, changing plant size and leaving on a scheduled review. The old plant operates until delivery. A larger plant changes capacity, overhead and the marginal-cost slope together. Firms with no profitable output can be temporarily idle and still incur committed costs.</p>
    <p>Operating surplus includes owner labor but excludes setup and resizing payments. Discounted net return deducts those payments when committed. Forecasts omit future unannounced shocks, option value of waiting, asset salvage, interim disruption, liquidity constraints and bankruptcy.</p>
    <a href="#/methods">Read equations and parameter meanings →</a>
  </details>
}

export function ComparePage({ selected }: { selected: string }) {
  const comparison = comparisons.find(c => c.id === selected) ?? comparisons[0]
  const arms = useMemo(() => comparison.arms.map(arm => ({ ...arm, result: run(arm.config) })), [comparison])
  const timeline = markers(arms.map(a => a.result), comparison.arms[0].config.periods)
  const lastRows = arms.map(a => a.result.rows.at(-1)!)
  const groups = [
    ...measures.map(m => ({ ...m, build: (r: Row) => r[m.key] })),
    { title: 'Customer awareness', unit: 'Percent of customer group', build: (r: Row) => r.customer * 100 },
    { title: 'Founder awareness', unit: 'Percent of founder cohort', build: (r: Row) => r.founder * 100 },
    { title: 'Pending entry', unit: 'Firm commitments', build: (r: Row) => r.pendingEntry },
    { title: 'Pending resizing', unit: 'Plant commitments', build: (r: Row) => r.pendingCapacity },
  ]
  return <>
    <Heading title="Compare the adjustment paths" eyebrow="Guided experiments">Start from matched conditions and track how a single mechanism changes what firms and customers experience.</Heading>
    <nav className="tabs" aria-label="Scenarios">{comparisons.map(c => <a key={c.id} href={`#/compare/${c.id}`} aria-current={c.id === comparison.id ? 'page' : undefined}>{c.title}</a>)}</nav>
    <section className="panel"><h2>{comparison.title}</h2><p>{comparison.description}</p>
      <div className="cards">{arms.map(({ label, result }, i) => {
        const end = lastRows[i]
        const activation = result.events.find(e => e.type === 'activation' && e.message.includes('resize'))
        return <div key={label}><h3>{label}</h3><p>Period {end.period} has {end.active} active firms and {fmt(end.quantity)} units sold. {end.price === null ? 'No transactions.' : `Price is ${fmt(end.price)} MU/unit.`} {activation && `First new plant arrives in period ${activation.period}.`}</p>
          <p>Discounted net return through period {end.period} is {fmt(end.discountedNet)} MU.</p>
          <a href={`#/lab/${encodeURIComponent(JSON.stringify(result.config))}`}>Open in market lab →</a>
          {exportsFor(result, end.period)}
        </div>
      })}</div>
    </section>
    <div className="chart-grid">{groups.map(group => <Chart key={group.title} title={group.title} unit={group.unit} xLabel="Period" zero={'zero' in group && group.zero} markers={timeline}
      rows={arms[0].result.rows.map((r, i) => ({ x: r.period, ...Object.fromEntries(arms.map((arm, j) => [`arm${j}`, group.build(arm.result.rows[i])])) }))}
      series={arms.map((arm, i) => ({ key: `arm${i}`, label: arm.label }))} />)}</div>
    <Assumptions />
  </>
}

function readLink(shared: string) {
  if (!shared) return { config: defaults, error: '' }
  try { return { config: validate(JSON.parse(decodeURIComponent(shared))), error: '' } }
  catch (error) { return { config: defaults, error: `Shared settings could not be loaded. Using defaults. ${(error as Error).message}` } }
}

export function LabPage({ shared }: { shared: string }) {
  const [loaded] = useState(() => readLink(shared))
  const [config, setConfig] = useState(loaded.config)
  const [draft, setDraft] = useState(loaded.config)
  const [error, setError] = useState(loaded.error)
  const [message, setMessage] = useState('')
  const [period, setPeriod] = useState(1)
  const [running, setRunning] = useState(false)
  const result = useMemo(() => run(config), [config])
  const current = result.rows[period - 1]
  const timeline = markers([result], period)

  useEffect(() => {
    if (!running || period >= config.periods) return
    const timer = setTimeout(() => setPeriod(period + 1), 420)
    return () => clearTimeout(timer)
  }, [running, period, config.periods])

  function load(c: Config, note: string) {
    setConfig(c); setDraft(c); setRunning(false); setPeriod(1); setError(''); setMessage(note)
  }
  function submit(e: FormEvent) {
    e.preventDefault()
    try {
      const next = validate(draft)
      const changes = (Object.keys(config) as (keyof Config)[]).filter(k => config[k] !== next[k])
      const labels = changes.map(k => k in fields ? fields[k as NumericField][0] : switches[k as keyof typeof switches])
      load(next, changes.length ? `Applied ${labels.join(', ')}. The path now starts again at period 1.` : 'Restarted with the current settings.')
    } catch (error) { setError((error as Error).message) }
  }
  const shownRows = result.rows.slice(0, period)
  const series = (key: string, label: string) => ({ key, label })
  const rowData = shownRows.map(({ firms: omitted, ...r }) => {
    void omitted
    return { ...r, x: r.period, customerPercent: r.customer * 100, founderPercent: r.founder * 100 }
  })
  const distribution: PlotRow[] = [...current.firms].sort((a, b) => a.economic - b.economic).map((f, i) => ({ x: i + 1, small: f.plant === 'small' ? f.economic : null, large: f.plant === 'large' ? f.economic : null, surplus: f.economic }))
  return <>
    <Heading eyebrow="Market lab" title="Play the market forward">See what changes when knowledge spreads, firms commit, and capacity arrives. Each step represents a model period.</Heading>
    <div className="panel">
      <h2>Playback</h2>
      <div className="actions">
        <button className="primary" onClick={() => { if (period === config.periods) setPeriod(1); setRunning(true) }}>Run</button>
        <button onClick={() => setRunning(false)} disabled={!running || period === config.periods}>Pause</button>
        <button onClick={() => { setRunning(false); setPeriod(period + 1) }} disabled={period === config.periods}>Step</button>
        <button onClick={() => { setRunning(false); setPeriod(1) }}>Reset</button>
        <button onClick={() => { setPeriod(1); setRunning(true) }}>Replay</button>
        <button onClick={() => { setRunning(false); setPeriod(config.periods) }}>Show full path</button>
      </div>
      <RangePeriod period={period} max={config.periods} change={next => { setRunning(false); setPeriod(next) }} />
      <p role="status">{message}</p>{error && <p role="alert" className="error">{error}</p>}
      <Metrics items={[[ 'Transaction price (MU/unit)', fmt(current.price)], ['Units per period', fmt(current.quantity)], ['Active firms', fmt(current.active)], ['Informed waiting founders', fmt(current.waiting)], ['Discounted net return (MU)', fmt(current.discountedNet)]]} />
      <p className="small">{current.decisions === 0 && current.pendingEntry + current.pendingCapacity + current.pendingExit === 0 ? 'There were no new decisions or outstanding commitments in this period.' : `${current.decisions} new decisions, ${current.pendingEntry} pending entries, ${current.pendingCapacity} pending plant changes and ${current.pendingExit} pending exits.`} A later review, learning update or shock can still change the path.</p>
      <details><summary>Edit simulation settings</summary><form onSubmit={submit}>
        <div className="form-grid">
          {Object.entries(fields).map(([key, [label, min, max, integer]]) => <label key={key}>{label}<input required type="number" min={min} max={max} step={integer ? 1 : 'any'} value={Number.isNaN(draft[key as NumericField]) ? '' : draft[key as NumericField]} onChange={e => setDraft({ ...draft, [key]: e.target.valueAsNumber })} /></label>)}
          {Object.entries(switches).map(([key, label]) => <label className="check" key={key}><input type="checkbox" checked={draft[key as keyof typeof switches]} onChange={e => setDraft({ ...draft, [key]: e.target.checked })} />{label}</label>)}
        </div><div className="actions"><button className="primary">Apply settings</button><button type="button" onClick={() => load(defaults, 'Restored the default settings.')}>Restore defaults</button></div>
      </form></details>
      <div className="actions"><a href={`#/lab/${encodeURIComponent(JSON.stringify(config))}`}>Link to these settings</a>
      <label className="import">Import run JSON<input type="file" accept="application/json,.json" onChange={async e => {
        const file = e.currentTarget.files?.[0]
        e.currentTarget.value = ''
        if (!file) return
        try { load(parseRecord(JSON.parse(await file.text())), 'Imported settings and reproduced the run from period 1.') }
        catch (error) { setError(`Import failed. ${(error as Error).message}`) }
      }} /></label></div>
      {exportsFor(result, period)}
    </div>
    <div className="chart-grid">
      {measures.map(m => <Chart key={m.key} title={m.title} unit={m.unit} xLabel="Period" rows={rowData} markers={timeline} zero={m.zero} series={[series(m.key, m.title)]} />)}
      <Chart title="Customer and founder awareness" unit="Percent of each group" xLabel="Period" rows={rowData} markers={timeline} series={[series('customerPercent', 'Customers'), series('founderPercent', 'Potential founders')]} />
      <Chart title="Operating firms and the pipeline" unit="Firms or commitments" xLabel="Period" rows={rowData} markers={timeline} series={[series('active', 'Active firms'), series('pendingEntry', 'Pending entrants'), series('pendingCapacity', 'Pending plant changes')]} />
      {distribution.length > 0 && <Chart title={`Operating surplus across firms in period ${period}`} unit="MU per firm before setup-cost recovery" xLabel="Firm rank by surplus" rows={distribution} zero series={[series('surplus', 'Surplus ranked from lowest to highest')]} />}
    </div>
    <details className="panel"><summary>Read the event log through period {period}</summary>
      <ul>{result.events.filter(event => event.period <= period).map((event, i) => <li key={i}>Period {event.period} · {event.message}</li>)}</ul>
      {!result.events.some(event => event.period <= period) && <p>No events have been recorded through this period.</p>}
    </details>
    <Assumptions />
    <Benchmark embedded />
  </>
}

function RangePeriod({ period, max, change }: { period: number; max: number; change: (n: number) => void }) {
  return <label className="range"><span>Period <output>{period} / {max}</output></span><input aria-label="Playback period" type="range" min={1} max={max} value={period} onChange={e => change(e.target.valueAsNumber)} /></label>
}
