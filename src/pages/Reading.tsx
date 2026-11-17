import { useState } from 'react'
import { Chart, Heading, useLocal } from '../components/ui'
import { chapters, glossary } from '../content/chapters'
import { sources } from '../content/sources'
import { market, benchmark, plants } from '../model/economics'

export function Home() {
  const points = Array.from({ length: 46 }, (_, i) => ({
    x: 10 + i,
    profit: market(benchmark, Array.from({ length: 10 + i }, () => plants.small)).outcomes[0].economic,
  }))
  return <>
    <section className="hero">
      <div className="hero-copy">
        <h1>From Opportunity <em>to Equilibrium</em></h1>
        <p className="subtitle">How businesses profit, compete, and survive in the short run and long run.</p>
        <p>When a new train station opens, Maya bets that commuters will pay for evening bicycle repair. What happens after customers tell their friends and rivals notice the opportunity?</p>
        <div className="actions"><a className="button primary" href="#/learn/1">Start with Maya <span aria-hidden="true">→</span></a><a className="button secondary" href="#/shop">Try Maya’s pricing decision</a></div>
      </div>
      <div className="hero-chart">
        <Chart title="What might entry do to profit?" unit="Economic profit per firm · MU per period" xLabel="Identical price-taking firms" rows={points} zero series={[{ key: 'profit', label: 'Economic operating profit' }]} />
        <p>In this synthetic benchmark, 40 identical firms bring economic operating profit to zero. The story explores when that logic applies.</p>
      </div>
    </section>
    <section className="start-list" aria-label="Explore the project">
      <a href="#/learn/1"><span>Read the story</span><strong>Nine short chapters</strong><p>Make predictions as Maya learns about her customers, costs and competitors.</p></a>
      <a href="#/compare"><span>Run the experiments</span><strong>Four guided comparisons</strong><p>Change entry, awareness, plant delivery or demand and see what follows.</p></a>
      <a href="#/worksheet"><span>Test a business idea</span><strong>A worksheet you can keep</strong><p>Document evidence and alternatives with a fictional warehouse example.</p></a>
    </section>
  </>
}

export function Learn({ index }: { index: number }) {
  const chapter = chapters[index]
  const [done, setDone] = useLocal<number[]>('economics-progress-v1', [])
  const [prediction, setPrediction] = useState<number | null>(null)
  return <div className="learn-layout">
    <aside className="chapter-nav"><span className="eyebrow">Read the story</span><p>{done.length} of {chapters.length} chapters complete</p>
      <progress value={done.length} max={chapters.length} aria-label="Chapter progress" />
      <nav aria-label="Chapters"><ol>{chapters.map((c, i) => <li key={c.title}><a href={`#/learn/${i + 1}`} aria-current={index === i ? 'page' : undefined}>{c.title}{done.includes(i) && <span aria-label="Complete"> ✓</span>}</a></li>)}</ol></nav>
      <a href="#/glossary">Glossary</a><br /><button className="text" onClick={() => setDone([])}>Reset progress</button>
      <p className="small">Progress stays in this browser.</p>
    </aside>
    <article className="reading">
      <Heading eyebrow={`Chapter ${index + 1} of ${chapters.length}`} title={chapter.title}>{chapter.story}</Heading>
      <section className="prediction"><h2>Make a prediction</h2><p>{chapter.prediction}</p>
        <div className="actions">{chapter.options.map((o, i) => <button key={o} aria-pressed={prediction === i} onClick={() => setPrediction(i)}>{o}</button>)}</div>
        <div aria-live="polite">{prediction !== null && <p><strong>{prediction === chapter.correct ? 'Correct. ' : 'Consider the alternative. '}</strong>{chapter.answer}</p>}</div>
      </section>
      <section><h2>The economics</h2>{chapter.lesson.map(p => <p key={p}>{p}</p>)}
        <p className="source-line">{chapter.sources.map(key => <a href={sources[key][3]} key={key}>{sources[key][0]}</a>)}</p>
      </section>
      <section className="panel try-it"><h2>Try it</h2><p>{chapter.experiment[2]}</p><a className="button" href={chapter.experiment[1]}>{chapter.experiment[0]} →</a>
        <p className="small"><strong>Model limitation.</strong> {chapter.limit}</p>
      </section>
      {chapter.math && <details className="panel"><summary>Optional mathematics</summary><p>{chapter.math}</p></details>}
      <section><h2>Apply it elsewhere</h2><p>{chapter.transfer}</p></section>
      <div className="actions">
        <button aria-pressed={done.includes(index)} onClick={() => setDone(done.includes(index) ? done.filter(i => i !== index) : [...done, index])}>{done.includes(index) ? 'Completed ✓' : 'Mark complete'}</button>
        {index > 0 && <a className="button" href={`#/learn/${index}`}>← Previous chapter</a>}
        {index < chapters.length - 1 && <a className="button primary" href={`#/learn/${index + 2}`}>Next chapter →</a>}
      </div>
    </article>
  </div>
}

export function Glossary() {
  return <><Heading title="Glossary">Terms used in the story and experiments.</Heading><dl className="glossary">{glossary.map(([term, meaning]) => <div key={term}><dt>{term}</dt><dd>{meaning}</dd></div>)}</dl><a href="#/learn/1">← Return to the chapters</a></>
}

export function Methods() {
  return <div className="reading">
    <Heading title="Methods and sources">The story and all inputs are synthetic. The labs show the consequences of stated assumptions. The project is a preliminary educational release.</Heading>
    <section><h2>Maya’s residual demand</h2><p>Weekly sales q = min(K, max(0, (a − p)/b)). Capacity K is 40 jobs/week, a = 120 MU/job and b = 2 MU/job per extra job/week. The default p = 60 MU/job yields 30 jobs and 1,800 MU in revenue. C = 300 + 20q is recognized weekly expense. Deducting 600 MU of owner labor from accounting operating profit leaves 300 MU in economic operating profit.</p><p>At prices 70 and 40, sales are 25 and 40 jobs and economic operating profits are 350 and −100 MU respectively. These are analytical fixtures.</p></section>
    <section><h2>Price-taking benchmark</h2><p>Demand is max(0, (A − P)/B). Plant cost is F + cq + dq²/2 and supply is min(K, max(0, (P − c)/d)). Small-plant F = 100, c = 20, d = 2 and K = 25. Large-plant F = 220, c = 20, d = 1.1 and K = 60. F includes 30 MU of opportunity cost of owner labor at either plant. A = 120 and B = 0.2 at baseline.</p>
      <p>The monotone clearing solver searches from zero to A in 50 bisections, with a closed-form shortcut when plants share identical parameters. At zero trade, there is no transaction price. At q = 0, average economic cost is undefined.</p>
      <p>For identical firms at positive interior output, q = (A − c)/(d + BN), P = c + dq and profit = dq²/2 − F. At 20 firms, q ≈ 16.6667, P ≈ 53.3333, and economic profit ≈ 177.7778 MU per firm. At 40 firms, q = 10, P = 40, economic profit = 0 and accounting profit = 30 MU.</p>
      <p>The continuous reference gives q* = √(2F/d), P* = c + d q*, and N* = (A − P*)/(B q*). It assumes replicable technology, feasible capacity, price taking and free entry, with A above P*. It isolates entry given a plant technology. In an integer model, a zero-value entrant may choose to stay out.</p>
    </section>
    <section><h2>Adjustment, investment and exit</h2><p>For customers and founders separately, Iₜ₊₁ = Iₜ + λ(ceiling − Iₜ). Aₜ = max(0, A + α I_customer + shock). The first floor(100 I_founder) founders in the fixed order are informed. They may apply if waiting. Exited founders cannot return. Each run starts with the specified number of small plants and no commitments.</p>
      <p>Decisions occur after that period’s market clears. Apply shocks, activate commitments, update awareness, clear and record the market, then review entry and incumbent decisions. Incumbents review every four periods by default and keep their old plant until a committed resize arrives. Exit takes one period.</p>
      <p>Value = −S + Σ Δflowₕ/(1+r)ʰ from h = 1 to H, with no salvage or interim costs by default. H = 120, r = 0.01 per period, and resize cost is 150 MU. A delay L activates exactly L periods after commitment. Post-entry forecasts account for the entrant and dated announced commitments. Expansions compare separate forecasts with and without the proposed change. The market holds the current intercept fixed in each forecast.</p>
      <p>Accounting operating profit deducts the recognized lease and variable costs. Operating surplus also deducts owner time. Cumulative discounted net return deducts setup and transition payments in the period paid and discounts the resulting resource-adjusted flow back to period zero. The model does not track a cash balance, foreknowledge, strategic interaction, externalities or waiting options.</p>
    </section>
    <section><h2>Reproduce a result</h2><p>Use 20 or 40 firms in the market benchmark and inspect the profit bridge. For a time path, open any comparison arm in the market lab, select Show full path, download its JSON, then import it. The model checks the ID, version, and parameter bounds and recomputes the output. A shared link encodes the same parameters. On-screen values round to at most two decimals. Exports retain full numerical precision.</p><p>For source reproduction, run <code>npm ci</code>, <code>npm test</code> and <code>npm run build</code> on Node 24. See MODEL_SPEC.md in the repository for the parameter dictionary and review conventions.</p></section>
    <section><h2>Reference bibliography</h2><ul className="bibliography">{Object.values(sources).map(([who, title, publication, url]) => <li key={title}><strong>{who}.</strong> <em>{title}.</em> {publication}. <a href={url}>Read source ↗</a></li>)}</ul></section>
    <section><h2>Research status</h2><p>Independent economics review and a human learning study are planned. The site makes no claim about learning effectiveness or business forecasting. Strategic oligopoly, networks, endogenous innovation and differentiated-demand competition are possible future model extensions.</p><p>The <a href="https://www.census.gov/programs-surveys/bds.html">Census Business Dynamics Statistics</a> and <a href="https://www.bls.gov/bdm/">BLS Business Employment Dynamics</a> can inform future questions about entry and exit. Neither is used to calibrate these examples or directly measures local learning or full economic profit.</p></section>
  </div>
}
