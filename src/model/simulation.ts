import { benchmark, clearPrice, firmOutcome, market, numberIn, plants, type Demand, type PlantName } from './economics.ts'

export const MODEL_ID = 'competitive-adjustment'
export const VERSION = '0.1.0'
export const FOUNDERS = 100
const EPSILON = 1e-8

export const defaults = {
  ...benchmark, initialFirms: 20, periods: 24, alpha: 0,
  customerStart: 0.2, customerCeiling: 1, customerRate: 0,
  founderStart: 0, founderCeiling: 1, founderRate: 0.08,
  entry: true, resize: false, exit: true,
  entryCost: 0, resizeCost: 150, entryDelay: 1, resizeDelay: 4,
  review: 4, horizon: 120, rate: 0.01, shockAt: 0, shockAmount: 0,
}
export type Config = typeof defaults
export const fields = {
  A: ['Base demand intercept', 0, 500], B: ['Demand slope', 0.01, 5],
  initialFirms: ['Initial small firms', 0, 50, true], periods: ['Displayed periods', 1, 80, true],
  alpha: ['Demand gain from customer awareness', 0, 200],
  customerStart: ['Initial customer awareness', 0, 1], customerCeiling: ['Customer ceiling', 0, 1], customerRate: ['Customer diffusion rate', 0, 1],
  founderStart: ['Initial founder awareness', 0, 1], founderCeiling: ['Founder ceiling', 0, 1], founderRate: ['Founder diffusion rate', 0, 1],
  entryCost: ['Entry payment (MU)', 0, 100000], resizeCost: ['Resize payment (MU)', 0, 100000],
  entryDelay: ['Entry delay (periods)', 1, 30, true], resizeDelay: ['Resize delay (periods)', 1, 30, true],
  review: ['Incumbent review interval', 1, 40, true], horizon: ['Forecast horizon (periods)', 1, 240, true],
  rate: ['Discount rate per period', 0, 1], shockAt: ['Shock period (0 disables)', 0, 80, true],
  shockAmount: ['Demand intercept change', -500, 500],
} as const
export type NumericField = keyof typeof fields
export const switches = { entry: 'Allow entry', resize: 'Allow resizing', exit: 'Allow exit' } as const

export function validate(raw: unknown): Config {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Expected a configuration object.')
  const values = raw as Record<string, unknown>
  for (const key of Object.keys(values)) if (!Object.hasOwn(defaults, key)) throw new Error(`Unknown parameter: ${key}.`)
  for (const [key, [label, min, max, integer]] of Object.entries(fields)) numberIn(values[key], label, min, max, integer)
  for (const key of Object.keys(switches)) if (typeof values[key] !== 'boolean') throw new Error(`${key} must be true or false.`)
  const config = { ...values } as Config
  if (config.customerStart > config.customerCeiling || config.founderStart > config.founderCeiling) {
    throw new Error('Initial awareness must be at or below its ceiling.')
  }
  return config
}

type Firm = { id: number; plant: PlantName }
type Commitment = { id: number; kind: 'entry' | 'resize' | 'exit'; due: number; plant?: PlantName; cost: number }
export type Event = { period: number; type: 'shock' | 'activation' | 'decision'; message: string }
type State = {
  period: number; firms: Firm[]; pending: Commitment[]; exited: number[];
  customer: number; founder: number; shock: number; events: Event[];
  cashCommitted: number; discountedNet: number
}

export function initial(c: Config): State {
  return {
    period: 0, firms: Array.from({ length: c.initialFirms }, (_, i) => ({ id: i - c.initialFirms, plant: 'small' })),
    pending: [], exited: [], customer: c.customerStart, founder: c.founderStart, shock: 0,
    events: [], cashCommitted: 0, discountedNet: 0,
  }
}

function apply(firms: Firm[], change: Commitment) {
  const index = firms.findIndex(f => f.id === change.id)
  if (change.kind === 'entry') firms.push({ id: change.id, plant: 'small' })
  else if (change.kind === 'exit') firms.splice(index, 1)
  else firms[index] = { id: change.id, plant: change.plant! }
}

function weight(first: number, end: number, r: number) {
  const count = end - first
  if (r === 0) return count
  const scale = Math.log1p(r)
  return Math.exp(-(first - 1) * scale) * -Math.expm1(-count * scale) / r
}

function presentValue(c: Config, s: State, m: Demand, id: number, proposal?: Commitment): number {
  const firms = [...s.firms]
  const events = proposal ? [...s.pending, proposal] : [...s.pending]
  events.sort((a, b) => a.due - b.due)
  let value = -(proposal?.cost ?? 0)
  let next = 0
  for (let h = 1; h <= c.horizon;) {
    while (next < events.length && events[next].due <= s.period + h) apply(firms, events[next++])
    const end = Math.min(c.horizon + 1, next < events.length ? events[next].due - s.period : c.horizon + 1)
    const subject = firms.find(f => f.id === id)
    if (subject) {
      const price = clearPrice(m, firms.map(f => plants[f.plant]))
      value += firmOutcome(plants[subject.plant], price).economic * weight(h, end, c.rate)
    }
    h = end
  }
  return value
}

const learn = (start: number, ceiling: number, rate: number) => Math.min(ceiling, start + rate * (ceiling - start))
const firmLabel = (id: number) => id >= 0 ? `Founder ${id + 1}` : `Incumbent ${-id}`

function step(c: Config, s: State) {
  s.period++
  const period = s.period
  function record(type: Event['type'], message: string) {
    s.events.push({ period, type, message })
  }
  if (c.shockAt === period && c.shockAmount !== 0) {
    s.shock += c.shockAmount
    record('shock', `Demand intercept changed by ${c.shockAmount} MU/unit.`)
  }
  for (const event of s.pending.filter(event => event.due === period)) {
    apply(s.firms, event)
    if (event.kind === 'exit') s.exited.push(event.id)
    record('activation', `${firmLabel(event.id)}: ${event.kind} took effect${event.plant ? ` (${event.plant} plant)` : ''}.`)
  }
  s.pending = s.pending.filter(event => event.due > period)
  s.customer = learn(s.customer, c.customerCeiling, c.customerRate)
  s.founder = learn(s.founder, c.founderCeiling, c.founderRate)
  const informed = Math.floor(FOUNDERS * s.founder)
  const m = { A: Math.max(0, c.A + c.alpha * s.customer + s.shock), B: c.B }
  const result = market(m, s.firms.map(f => plants[f.plant]))
  const firms = s.firms.map((f, i) => ({ ...f, capacity: plants[f.plant].K, ...result.outcomes[i] }))
  const operating = firms.reduce((sum, f) => sum + f.economic, 0)
  const accounting = firms.reduce((sum, f) => sum + f.accounting, 0)
  let spent = 0
  let decisions = 0
  function commit(event: Commitment, reason: string) {
    s.pending.push(event)
    spent += event.cost
    decisions++
    record('decision', `${firmLabel(event.id)}: ${event.kind} scheduled for period ${event.due}. ${reason}`)
  }
  const unavailable = new Set([...s.exited, ...s.firms.map(f => f.id), ...s.pending.map(p => p.id)])
  if (c.entry) {
    for (let id = 0; id < informed; id++) {
      if (unavailable.has(id)) continue
      const proposal: Commitment = { id, kind: 'entry', due: period + c.entryDelay, cost: c.entryCost }
      const value = presentValue(c, s, m, id, proposal)
      if (value <= EPSILON) break // Remaining founders have identical plants, costs and dates.
      commit(proposal, `Expected post-entry value ${value.toFixed(2)} MU.`)
    }
  }
  if ((c.exit || c.resize) && period % c.review === 0) {
    for (const f of [...s.firms].sort((a, b) => a.id - b.id)) {
      if (s.pending.some(event => event.id === f.id)) continue
      const keep = presentValue(c, s, m, f.id)
      const alternative: Commitment = {
        id: f.id, kind: 'resize', plant: f.plant === 'small' ? 'large' : 'small',
        due: period + c.resizeDelay, cost: c.resizeCost,
      }
      const resize = c.resize ? presentValue(c, s, m, f.id, alternative) : -Infinity
      if (resize > Math.max(keep, c.exit ? 0 : -Infinity) + EPSILON) {
        commit(alternative, `Increment over keeping plant: ${(resize - keep).toFixed(2)} MU.`)
      } else if (c.exit && keep < -EPSILON) {
        commit({ id: f.id, kind: 'exit', due: period + 1, cost: 0 }, `Continuation value ${keep.toFixed(2)} MU, with no preferable resize.`)
      }
    }
  }
  s.cashCommitted += spent
  s.discountedNet += (operating - spent) / (1 + c.rate) ** period
  return {
    period, demandIntercept: m.A, price: result.price, quantity: result.quantity, active: firms.length, accounting, operating,
    discountedNet: s.discountedNet, customer: s.customer, founder: s.founder, informed, decisions,
    waiting: informed - new Set([...s.exited, ...firms.map(f => f.id), ...s.pending.map(e => e.id)].filter(id => id >= 0)).size,
    pendingEntry: s.pending.filter(event => event.kind === 'entry').length,
    pendingCapacity: s.pending.filter(event => event.kind === 'resize').length,
    pendingExit: s.pending.filter(event => event.kind === 'exit').length,
    capacity: firms.reduce((sum, f) => sum + f.capacity, 0),
    setupAndTransition: spent, cashCommitted: s.cashCommitted, consumerSurplus: result.consumerSurplus, firms,
  }
}
export type Row = ReturnType<typeof step>

export function run(raw: unknown) {
  const config = validate(raw)
  const state = initial(config)
  const initialState = structuredClone(state)
  const rows = Array.from({ length: config.periods }, () => step(config, state))
  return { modelId: MODEL_ID, version: VERSION, units: { time: 'period', output: 'units per period', money: 'MU' },
    config, initialState, order: 'ascending founder ID, then ascending incumbent ID at review; no random seed',
    events: state.events, finalState: state, rows }
}
export type Run = ReturnType<typeof run>

export function parseRecord(value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('Expected a versioned simulation record.')
  const { modelId, version, config } = value as Partial<Run>
  if (modelId !== MODEL_ID || version !== VERSION) throw new Error('Unsupported simulation model or version.')
  return validate(config)
}
