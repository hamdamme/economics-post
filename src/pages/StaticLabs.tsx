import { useState } from 'react'
import { Chart, Heading, Metrics, Range, exportFile, fmt } from '../components/ui'
import { benchmark, demand, market, plants, reference, shop, shopDefault, supply, variable } from '../model/economics'

export function ShopPage() {
  const [p, set] = useState(shopDefault)
  const r = shop(p)
  const curve = Array.from({ length: 61 }, (_, i) => ({ x: i * Math.max(150, p.intercept) / 60, sold: 0, unconstrained: 0, capacity: p.capacity }))
  for (const point of curve) {
    point.sold = shop({ ...p, price: point.x }).quantity
    point.unconstrained = Math.max(0, (p.intercept - point.x) / p.slope)
  }
  const bridge = [
    ['Revenue', r.revenue], ['Variable expense', -r.variable], ['Recognized overhead', -p.overhead], ['Accounting profit', r.accounting],
    ['Owner labor', -p.labor], ['Owned capital', -p.capital], ['Economic profit', r.economic],
  ] as const
  const peak = Math.max(1, ...bridge.map(([, n]) => Math.abs(n)))
  return <>
    <Heading eyebrow="Maya’s shop" title="What did Maya really earn?">Maya sets the price for one standard repair. See how that decision changes expected weekly sales and what remains after paying for her time.</Heading>
    <div className="side-layout"><section className="panel controls"><h2>Set the terms</h2>
      <Range label="Price (MU per job)" value={p.price} min={0} max={150} change={price => set({ ...p, price })} />
      <Range label="Capacity (jobs per week)" value={p.capacity} min={0} max={80} change={capacity => set({ ...p, capacity })} />
      <Range label="Owner labor (MU per week)" value={p.labor} min={0} max={1600} step={10} change={labor => set({ ...p, labor })} />
      <Range label="Additional owned capital (MU per week)" value={p.capital} min={0} max={1000} step={10} change={capital => set({ ...p, capital })} />
      <div className="actions"><button onClick={() => set({ ...p, price: 70 })}>Try 70 MU</button><button onClick={() => set({ ...p, price: 40 })}>Try 40 MU</button><button onClick={() => set(shopDefault)}>Reset</button></div>
      <p className="small">At {fmt(p.price)} MU, Maya sells {fmt(r.quantity)} expected jobs. {r.quantity === p.capacity ? 'Capacity limits sales at this price.' : 'Demand at this price determines sales.'}</p>
    </section><section>
      <Metrics items={[[ 'Jobs per week', fmt(r.quantity)], ['Revenue (MU/week)', fmt(r.revenue)], ['Recognized expenses (MU/week)', fmt(r.expenses)], ['Economic profit (MU/week)', fmt(r.economic)]]} />
      <Chart title="Demand for Maya’s repairs" unit="Jobs per week" xLabel="Price (MU/job)" rows={curve} markers={[{ x: p.price, label: 'Chosen price' }]} series={[{ key: 'sold', label: 'Expected sales' }, { key: 'unconstrained', label: 'Demand before capacity limit' }, { key: 'capacity', label: 'Capacity' }]} />
    </section></div>
    <section className="panel"><h2>From revenue to economic profit</h2><p>Weekly monetary units (MU). The center line is zero. The first three items lead to accounting profit. Subtract the two opportunity costs to get economic profit.</p>
      <dl className="bridge">{bridge.map(([label, n]) => <div key={label}><dt>{label}</dt><div className="bar-track" aria-hidden="true"><i style={{ width: `${Math.abs(n) / peak * 50}%`, left: `${n >= 0 ? 50 : 50 - Math.abs(n) / peak * 50}%` }} data-negative={n < 0} /></div><dd>{fmt(n)}</dd></div>)}</dl>
      <button onClick={() => exportFile('maya-shop.csv', 'measure,MU_per_week\n' + bridge.map(([label, value]) => `${label},${value}`).join('\n') + '\n\nprice_MU_per_job,expected_sales_jobs_per_week,unconstrained_demand_jobs_per_week,capacity_jobs_per_week\n' + curve.map(v => [v.x, v.sold, v.unconstrained, v.capacity].join(',')).join('\n'), 'text/csv')}>Download chart CSV</button>
    </section>
    <details className="panel"><summary>Assumptions and equations</summary><p>Expected sales are the smaller of capacity and max(0, (120 − price) ÷ 2). The slope is 2 MU/job for each additional job/week. Recognized overhead is 300 MU/week and variable cost is 20 MU/job. The baseline leases its assets. The capital slider applies only to owned resources whose opportunity cost is additional.</p><p>This synthetic curve is assumed. There is no schedule for debt, taxes, inventories or investment. Timing of receipts and payments determines cash flow.</p></details>
  </>
}

export function Benchmark({ embedded = false }: { embedded?: boolean }) {
  const [count, setCount] = useState(20)
  const [capacity, setCapacity] = useState(25)
  const plant = { ...plants.small, K: capacity }
  const m = benchmark
  const r = market(m, Array.from({ length: count }, () => plant))
  const f = r.outcomes[0]
  const ref = reference(m, plant)
  const priceCurve = Array.from({ length: 61 }, (_, i) => {
    const price = i * 2
    return { x: price, demand: demand(m, price), supply: count * supply(plant, price) }
  })
  const costCurve = Array.from({ length: 41 }, (_, i) => {
    const q = i * Math.max(25, capacity) / 40
    return { x: q, mc: plant.c + plant.d * q, ac: q > 0 ? (plant.F + variable(plant, q)) / q : null, price: r.price }
  })
  return <section aria-label="Competitive benchmark">
    {embedded ? <h2>Competitive benchmark</h2> : <Heading eyebrow="Market lab" title="A market of price takers">A separate synthetic market with standardized output and small firms. Each small plant initially holds up to 25 units per period.</Heading>}
    <div className="side-layout"><section className="panel controls"><h3>Market inputs</h3>
      <Range label="Identical firms" value={count} min={0} max={65} change={setCount} />
      <Range label="Capacity per firm" value={capacity} min={0} max={40} change={setCapacity} />
      <div className="actions"><button onClick={() => { setCount(20); setCapacity(25) }}>20 firms</button><button onClick={() => { setCount(40); setCapacity(25) }}>40 firms</button></div>
      <p className="small">{ref ? `Conditional continuous reference: ${fmt(ref.count)} firms at ${fmt(ref.price)} MU/unit.` : 'This capacity is below the output required by the unconstrained free-entry reference.'}</p>
    </section><section>
      <Metrics items={[[ 'Transaction price (MU/unit)', fmt(r.price)], ['Total units per period', fmt(r.quantity)], ['Firm output', f ? fmt(f.q) : 'No active firm'], ['Consumer surplus (MU/period)', fmt(r.consumerSurplus)]]} />
      <p className="small">{r.price === null ? 'There are no transactions in this configuration. The theoretical demand choke price is 120 MU/unit.' : `The market clears at ${fmt(r.quantity)} units. Consumer surplus is implied by the assumed demand curve.`}</p>
    </section></div>
    <div className="chart-grid">
      <Chart title="Demand and aggregate supply" unit="Units per period" xLabel="Price (MU/unit)" rows={priceCurve} markers={r.price === null ? [] : [{ x: r.price, label: 'Clearing price' }]} series={[{ key: 'demand', label: 'Demand' }, { key: 'supply', label: 'Supply' }]} />
      <Chart title="Costs of one small plant" unit="MU per unit" xLabel="Firm output per period" rows={costCurve} markers={[{ x: capacity, label: 'Capacity' }, ...(f && f.q !== capacity ? [{ x: f.q, label: 'Chosen output' }] : [])]} series={[{ key: 'mc', label: 'Marginal cost' }, { key: 'ac', label: 'Average economic cost' }, { key: 'price', label: 'Transaction price' }]} />
    </div>
    <section className="panel"><h3>Firm profit bridge</h3>{f ? <Metrics items={[[ 'Revenue (MU/period)', fmt(f.revenue)], ['Recognized costs (MU/period)', fmt(plant.overhead + f.variableCost)], ['Accounting profit (MU/period)', fmt(f.accounting)], ['Owner labor (MU/period)', fmt(f.ownerLabor)], ['Economic profit (MU/period)', fmt(f.economic)], ['Average economic cost (MU/unit)', f.averageEconomicCost === null ? 'Undefined at zero output' : fmt(f.averageEconomicCost)]]} /> : <p>Select at least one firm to see operating costs.</p>}
    <div className="actions">
      <button onClick={() => exportFile('benchmark-market.csv', 'price_MU_per_unit,demand_units,supply_units\n' + priceCurve.map(v => [v.x, v.demand, v.supply].join(',')).join('\n'), 'text/csv')}>Download market CSV</button>
      <button onClick={() => exportFile('benchmark-costs.csv', 'firm_output,marginal_cost,average_economic_cost,transaction_price\n' + costCurve.map(v => [v.x, v.mc, v.ac, v.price].join(',')).join('\n'), 'text/csv')}>Download costs CSV</button>
    </div></section>
    <details className="panel"><summary>Assumptions and equations</summary><p>Demand is max(0, (120 − P)/0.2). The typical plant supplies min(K, max(0, (P − 20)/2)). Its economic cost is 100 + 20q + q². The 100 includes 70 recognized overhead and 30 owner labor. At a positive interior choice, marginal cost equals price. Committed overhead remains when output is zero, and average cost is undefined there.</p><p>The continuous reference gives zero economic profit if identical firms can enter and replicate the technology at a feasible scale. Strategic price setting, quality changes and externalities are outside this benchmark.</p></details>
  </section>
}
