/** Numerical functions shared by the static labs and simulation. */
export function numberIn(value: unknown, name: string, min: number, max: number, integer = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new Error(`${name} must be ${integer ? 'a whole number' : 'a number'} from ${min} to ${max}.`)
  }
  return value
}

export type Shop = typeof shopDefault
export const shopDefault = { capacity: 40, intercept: 120, slope: 2, price: 60, cost: 20, overhead: 300, labor: 600, capital: 0 }

export function shop(p: Shop) {
  for (const [key, value] of Object.entries(p)) numberIn(value, key, key === 'slope' ? 0.001 : 0, 100000)
  const quantity = Math.min(p.capacity, Math.max(0, (p.intercept - p.price) / p.slope))
  const revenue = p.price * quantity
  const variable = p.cost * quantity
  const expenses = p.overhead + variable
  const accounting = revenue - expenses
  return { quantity, revenue, variable, expenses, accounting, economic: accounting - p.labor - p.capital }
}

export type Plant = { F: number; c: number; d: number; K: number; overhead: number }
export type Demand = { A: number; B: number }
export const plants = {
  small: { F: 100, c: 20, d: 2, K: 25, overhead: 70 },
  large: { F: 220, c: 20, d: 1.1, K: 60, overhead: 190 },
} satisfies Record<string, Plant>
export type PlantName = keyof typeof plants
export const benchmark = { A: 120, B: 0.2 }
export const demand = (m: Demand, price: number) => Math.max(0, (m.A - price) / m.B)
export const supply = (p: Plant, price: number) => Math.min(p.K, Math.max(0, (price - p.c) / p.d))
export const variable = (p: Plant, q: number) => p.c * q + 0.5 * p.d * q * q

function validateMarket(m: Demand, firms: readonly Plant[]) {
  numberIn(m.A, 'Demand intercept', 0, 100000)
  numberIn(m.B, 'Demand slope', 0.000001, 100000)
  for (const p of firms) {
    numberIn(p.F, 'Economic overhead', 0.000001, 100000)
    numberIn(p.c, 'Initial marginal cost', 0, 100000)
    numberIn(p.d, 'Marginal cost slope', 0.000001, 100000)
    numberIn(p.K, 'Capacity', 0, 100000)
    numberIn(p.overhead, 'Recognized overhead', 0, p.F)
  }
}

export function clearPrice(m: Demand, firms: readonly Plant[]) {
  const first = firms[0]
  if (!first || m.A === 0) return null
  if (firms.every(p => p === first)) {
    const q = Math.min(first.K, Math.max(0, (m.A - first.c) / (first.d + m.B * firms.length)))
    return q > 0 ? (q === first.K ? m.A - m.B * q * firms.length : first.c + first.d * q) : null
  }
  if (!firms.some(p => p.K > 0 && p.c < m.A)) return null
  let low = 0
  let high = m.A
  for (let i = 0; i < 50; i++) {
    const price = (low + high) / 2
    const available = firms.reduce((sum, p) => sum + supply(p, price), 0)
    if (available < demand(m, price)) low = price
    else high = price
  }
  return (low + high) / 2
}

export function firmOutcome(p: Plant, price: number | null) {
  const q = price === null ? 0 : supply(p, price)
  const revenue = (price ?? 0) * q
  const variableCost = variable(p, q)
  const accounting = revenue - variableCost - p.overhead
  return { q, revenue, variableCost, accounting, economic: revenue - variableCost - p.F,
    ownerLabor: p.F - p.overhead, averageEconomicCost: q > 0 ? (p.F + variableCost) / q : null }
}

export function market(m: Demand, firms: readonly Plant[]) {
  validateMarket(m, firms)
  const price = clearPrice(m, firms)
  const outcomes = firms.map(p => firmOutcome(p, price))
  const quantity = outcomes.reduce((sum, f) => sum + f.q, 0)
  return { price, quantity, outcomes, consumerSurplus: price === null ? 0 : 0.5 * (m.A - price) * quantity }
}

export function reference(m: Demand, p: Plant) {
  validateMarket(m, [p])
  const q = Math.sqrt(2 * p.F / p.d)
  const price = p.c + p.d * q
  return m.A > price && p.K >= q ? { q, price, count: demand(m, price) / q } : null
}
