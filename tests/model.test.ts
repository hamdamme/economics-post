import { test } from 'node:test'
import assert from 'node:assert/strict'
import { benchmark, demand, market, plants, reference, shop, shopDefault } from '../src/model/economics.ts'
import { comparisons } from '../src/scenarios/presets.ts'
import { defaults, parseRecord, run } from '../src/model/simulation.ts'

const almost = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} ≠ ${expected}`)
const identical = (n: number) => Array.from({ length: n }, () => plants.small)

test('Maya fixtures reconcile each cost and the price response', () => {
  const base = shop(shopDefault)
  assert.deepEqual(base, { quantity: 30, revenue: 1800, variable: 600, expenses: 900, accounting: 900, economic: 300 })
  for (const [price, quantity, economic] of [[70, 25, 350], [40, 40, -100]]) {
    const result = shop({ ...shopDefault, price })
    assert.equal(result.quantity, quantity)
    assert.equal(result.economic, economic)
  }
  assert.equal(shop({ ...shopDefault, capital: 75 }).economic, 225)
})

test('competitive fixtures match closed form and distinguish accounting profit', () => {
  const twenty = market(benchmark, identical(20))
  almost(twenty.price!, 53.3333333333)
  almost(twenty.outcomes[0].q, 16.6666666667)
  almost(twenty.outcomes[0].economic, 177.7777777778)
  const forty = market(benchmark, identical(40))
  almost(forty.price!, 40)
  almost(forty.outcomes[0].q, 10)
  almost(forty.outcomes[0].economic, 0)
  almost(forty.outcomes[0].accounting, 30)
  almost(reference(benchmark, plants.small)!.count, 40)
})

test('heterogeneous constrained output clears, respects capacity and optimizes', () => {
  const technologies = [{ ...plants.small, K: 3 }, plants.large, ...identical(12)]
  const result = market(benchmark, technologies)
  almost(result.quantity, demand(benchmark, result.price!))
  assert.equal(result.outcomes[0].q, 3)
  assert.ok(result.price! > technologies[0].c + technologies[0].d * 3)
  for (const [index, firm] of result.outcomes.entries()) {
    const tech = technologies[index]
    assert.ok(firm.q >= 0 && firm.q <= tech.K)
    if (firm.q > 0 && firm.q < tech.K) almost(result.price!, tech.c + tech.d * firm.q)
    almost(firm.q * result.price!, firm.revenue)
    almost(firm.accounting - firm.ownerLabor, firm.economic)
  }
  assert.equal(reference(benchmark, technologies[0]), null)
})

test('no trade has no sale price, zero receipts and undefined average cost', () => {
  for (const [a, n, k] of [[0, 2, 25], [120, 0, 25], [120, 2, 0], [19, 2, 25]]) {
    const p = { ...plants.small, K: k }
    const result = market({ A: a, B: 0.2 }, Array.from({ length: n }, () => p))
    assert.equal(result.price, null)
    assert.equal(result.quantity, 0)
    result.outcomes.forEach(f => {
      assert.equal(f.revenue, 0)
      assert.equal(f.economic, -100)
      assert.equal(f.averageEconomicCost, null)
    })
  }
  assert.throws(() => market({ A: 120, B: 0 }, identical(2)), /slope/)
  assert.throws(() => market(benchmark, [{ ...plants.small, F: 0 }]), /overhead/)
})

test('integer entry stops at 39 and a blocked-entry arm holds at 20', () => {
  const [allowed, blocked] = comparisons[0].arms.map(arm => run(arm.config))
  assert.equal(allowed.rows.at(-1)!.active, 39)
  assert.equal(blocked.rows.at(-1)!.active, 20)
  assert.equal(allowed.rows.at(-1)!.pendingEntry, 0)
  assert.ok(allowed.rows.at(-1)!.price! < blocked.rows.at(-1)!.price!)
})

test('awareness channels act independently and the founder ceiling bounds entry', () => {
  const [frozen, customers, founders] = comparisons[1].arms.map(arm => run(arm.config))
  assert.equal(frozen.rows.at(-1)!.founder, 0)
  assert.equal(customers.rows.at(-1)!.active, frozen.rows.at(-1)!.active)
  assert.ok(customers.rows.at(-1)!.demandIntercept > frozen.rows.at(-1)!.demandIntercept)
  assert.equal(founders.rows.at(-1)!.demandIntercept, frozen.rows.at(-1)!.demandIntercept)
  assert.ok(founders.rows.at(-1)!.active > frozen.rows.at(-1)!.active)
  const limited = run({ ...defaults, founderCeiling: .04, founderRate: 1 })
  assert.equal(limited.rows.at(-1)!.informed, 4)
  assert.equal(limited.rows.at(-1)!.active, 24)
})

test('no incumbents is a valid counterfactual entry case, zero demand blocks it', () => {
  const result = run({ ...defaults, initialFirms: 0, rate: 0, periods: 3 })
  assert.equal(result.rows[0].price, null)
  assert.equal(result.rows[0].active, 0)
  assert.equal(result.rows[0].pendingEntry, 8)
  assert.equal(result.rows[1].active, 8)
  assert.ok(result.rows[1].quantity > 0)
  const noDemand = run({ ...defaults, A: 0, periods: 8 })
  assert.equal(noDemand.rows[0].price, null)
  assert.equal(noDemand.rows[0].active, 20)
  assert.equal(noDemand.rows[3].active, 20)
  assert.equal(noDemand.rows[4].active, 0)
  assert.equal(noDemand.rows.at(-1)!.pendingEntry, 0)
})

test('decision payments occur before activation, and discounted returns reconcile', () => {
  const result = run({ ...defaults, entryDelay: 4, entryCost: 125, periods: 6 })
  assert.equal(result.rows[0].pendingEntry, 8)
  assert.equal(result.rows[0].setupAndTransition, 1000)
  assert.equal(result.rows[3].active, 20)
  assert.equal(result.rows[4].active, 28)
  let sum = 0
  for (const r of result.rows) {
    sum += (r.operating - r.setupAndTransition) / 1.01 ** r.period
    almost(r.discountedNet, sum)
  }
  const blocked = run({ ...defaults, entryCost: 100000 })
  assert.equal(blocked.rows.at(-1)!.active, 20)
})

test('early candidate commitments enter the forecast before incumbent review', () => {
  const result = run({ ...defaults, review: 1, resize: true, A: 260, initialFirms: 8, periods: 2 })
  const decisions = result.events.filter(e => e.period === 1 && e.type === 'decision')
  assert.ok(decisions.some(e => e.message.startsWith('Founder')))
  assert.ok(decisions.some(e => e.message.startsWith('Incumbent')))
  const firstIncumbent = decisions.findIndex(e => e.message.startsWith('Incumbent'))
  assert.ok(decisions.slice(firstIncumbent).every(e => e.message.startsWith('Incumbent')))
  assert.equal(result.rows[0].active, 8)
  assert.equal(result.rows[0].capacity, 200)
})

test('resizing preserves the old plant until exact delivery and charges only once', () => {
  const [fast, slow] = comparisons[2].arms.map(arm => run(arm.config))
  assert.equal(fast.rows[3].capacity, slow.rows[3].capacity)
  assert.ok(fast.rows[3].setupAndTransition > 0)
  assert.equal(fast.rows[3].setupAndTransition, slow.rows[3].setupAndTransition)
  assert.ok(fast.rows[4].capacity > slow.rows[4].capacity)
  assert.equal(slow.rows[6].capacity, slow.rows[3].capacity)
  assert.equal(slow.rows[7].capacity, fast.rows[7].capacity)
  assert.equal(fast.rows[4].setupAndTransition, 0)
})

test('unexpected reversal keeps earlier commitments and records subsequent exit', () => {
  const [stable, shock] = comparisons[3].arms.map(arm => run(arm.config))
  assert.deepEqual(shock.rows.slice(0, 5), stable.rows.slice(0, 5))
  const p6 = shock.events.filter(e => e.period === 6)
  assert.equal(p6[0].type, 'shock')
  assert.equal(p6[1].type, 'activation')
  assert.ok(shock.rows[5].active > shock.rows[4].active)
  assert.ok(shock.rows.at(-1)!.active < stable.rows.at(-1)!.active)
  assert.ok(shock.finalState.exited.length > 0)
})

test('versioned records reproduce results and reject partial or invalid settings', () => {
  for (const comp of comparisons) for (const arm of comp.arms) {
    const result = run(arm.config)
    assert.deepEqual(run(parseRecord(JSON.parse(JSON.stringify(result)))), result)
  }
  assert.throws(() => run({ ...defaults, founderCeiling: -.1 }), /Founder ceiling/)
  assert.throws(() => run({ ...defaults, founderStart: .7, founderCeiling: .5 }), /ceiling/)
  assert.throws(() => run({ ...defaults, entryDelay: 0 }), /Entry delay/)
  assert.throws(() => run({ ...defaults, B: NaN }), /Demand slope/)
  assert.throws(() => run({ A: 120 }), /Demand slope/)
  assert.throws(() => parseRecord({ ...run(defaults), version: 'other' }), /Unsupported/)
})
