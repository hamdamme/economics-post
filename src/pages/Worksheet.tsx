import { useState } from 'react'
import { Heading, exportFile, exportJson, useLocal } from '../components/ui'

const sections = [
  ['Customer and substitutes', 'Who needs what? Which alternatives would they use instead?'],
  ['The change', 'What changed, and why does that create demand now?'],
  ['Full costs and cash needs', 'Include operating costs, spending dates, owner time, capital and alternatives.'],
  ['Inputs and commitments', 'Which inputs can move now, and which require commitments or lead time?'],
  ['Knowledge and imitation', 'What do customers and rivals know? What remains hard to copy?'],
  ['Founder requirements', 'What must an entrant obtain, spend, finance or learn?'],
  ['Source and duration of advantage', 'What sustains the margin, and when might that advantage expire?'],
  ['Adverse changes and responses', 'How could the business respond to lower demand, higher costs, new rivals or different technology?'],
  ['Decision conditions', 'What evidence would justify a test, entry, expansion, adaptation, continuation or exit?'],
] as const
const columns = ['Evidence', 'Plausible range', 'Unresolved question'] as const
const caseNames = ['Base', 'Adverse', 'Favorable'] as const
const blank = { name: '', answers: sections.map(() => ['', '', '']), cases: caseNames.map(() => ({ assumptions: '', response: '' })) }
const warehouse = {
  name: 'Freight-transfer warehouse (fictional)',
  answers: [
    ['Three fictional dispatchers describe missed delivery windows near a freight terminal. Alternatives include a truck yard or longer drive to a cross-dock.', '3–8 short-hold loads per week.', 'Will dispatchers reserve and pay for a slot?'],
    ['An invented carrier tightened its receiving window while nearby traffic shifted to a new interchange.', 'One to three carriers may face the window change.', 'Could their schedules revert next quarter?'],
    ['Illustrative charges average 260 MU/load. Handling averages 90 MU/load. Lease and overhead 500 MU/week, owner time 250 MU/week and setup 1,800 MU upfront. The lease already includes the forklift.', 'Handling 75–125 MU/load; 4–8 owner hours at comparable wages. Payment may trail delivery by 14–30 days.', 'Will extra staffing or insurance change the margin and cash requirement?'],
    ['The fictional lease includes one dock. Scheduling and handoff procedures can change now. A second dock needs a separate lease.', 'One or two simultaneous lots depending on floorspace and arrival bunching.', 'Can paid pilot loads be safely processed at peak arrivals?'],
    ['Dispatchers hear about the service through brokers. Rival yards can see the location, while reliability and call volume are harder to assess.', 'Several weeks to build repeat carrier referrals.', 'Would brokerage partners share demand with a competing depot?'],
    ['Entrants need dock access, insurance, trained staff, handling equipment and working capital.', 'A small entrant might need one staffed shift and one to four weeks of cash buffer.', 'Are nearby docks available under comparable lease terms?'],
    ['Late collection, short detours and reliable handoffs may save drivers time. Lease terms affect who retains the location value.', 'Advantage could last through a short pilot or up to lease renewal.', 'Would carriers pay more for a guaranteed handoff slot?'],
    ['The team could shorten hours under weak demand, raise minimum order size if costs rise, retain customers with reliable handoffs or integrate appointment software.', 'Pilot 3 to 8 loads weekly and stress handling at 125 MU/load.', 'How would a competing yard’s new evening shift change bookings?'],
    ['The fictional operator will seek paid reservations before committing. Contribution is 170 MU/load before 750 MU/week of overhead and owner labor.', 'Five loads cover modeled recurring full costs at baseline; setup recovery and cash timing still need separate checks.', 'What repeat volume offsets setup within the lease term?'],
  ],
  cases: [
    { assumptions: 'Five loads/week at 260 MU each; 90 MU handling per load; 750 MU/week overhead and owner time. Weekly resource operating surplus 100 MU.', response: 'Run an appointment-only pilot. Check settlement terms and repeat bookings before signing a longer lease.' },
    { assumptions: 'Three loads/week at 260 MU; handling rises to 125 MU/load. Weekly resource operating surplus −345 MU.', response: 'Reduce committed shifts if possible. Decline an extended lease if repeat paid demand remains weak.' },
    { assumptions: 'Eight loads/week at 260 MU; handling averages 90 MU/load. Weekly resource operating surplus 610 MU before setup recovery.', response: 'Test arrival overlap and staffing first. Evaluate additional space against keeping the existing dock.' },
  ],
}

export function Worksheet() {
  const [saved, setSaved] = useLocal('economics-worksheet-v1', blank)
  const [status, setStatus] = useState('')
  const data = saved?.answers?.length === sections.length && saved?.cases?.length === caseNames.length ? saved : blank
  function update(i: number, j: number, value: string) {
    setSaved({ ...data, answers: data.answers.map((row, index) => index === i ? row.map((cell, column) => column === j ? value : cell) : row) })
  }
  function updateCase(i: number, key: 'assumptions' | 'response', value: string) {
    setSaved({ ...data, cases: data.cases.map((item, index) => index === i ? { ...item, [key]: value } : item) })
  }
  const report = {
    version: '0.1.0', business: data.name,
    sections: sections.map(([area], i) => ({ area, evidence: data.answers[i][0], range: data.answers[i][1], question: data.answers[i][2] })),
    cases: data.cases.map((item, i) => ({ name: caseNames[i], ...item })),
  }
  return <>
    <Heading title="Evaluate a business" eyebrow="Worksheet">Record evidence, a plausible range and a question for each part of the decision. Compare what you would do in three different cases.</Heading>
    <section className="panel">
      <div className="actions no-print">
        <button onClick={() => { setSaved(warehouse); setStatus('Loaded the fictional warehouse example.') }}>Load warehouse example</button>
        <button onClick={() => { setSaved(blank); setStatus('Cleared the worksheet.') }}>Reset worksheet</button>
        <button onClick={() => window.print()}>Print / save PDF</button>
        <button onClick={() => exportJson('business-worksheet.json', report)}>Download JSON</button>
        <button onClick={() => exportFile('business-worksheet.md', `# ${report.business || 'Business worksheet'}\n\n` +
          report.sections.map(s => `## ${s.area}\n\n- Evidence: ${s.evidence}\n- Plausible range: ${s.range}\n- Unresolved question: ${s.question}\n`).join('\n') + '\n' +
          report.cases.map(c => `## ${c.name} case\n\n${c.assumptions}\n\nResponse: ${c.response}\n`).join('\n'), 'text/markdown')}>Download Markdown</button>
      </div>
      <p className="small no-print">Your draft is stored in this browser. Loading the example or resetting replaces the current draft.</p>
      <p className="no-print" role="status">{status}</p>
      <label className="no-print">Business name<input value={data.name} onChange={e => setSaved({ ...data, name: e.target.value })} /></label>
      <h2 className="print-only">{data.name}</h2>
    </section>
    {sections.map(([area, prompt], i) => <section className="panel worksheet-card" key={area}>
      <h2>{area}</h2><p>{prompt}</p><div className="form-grid">{columns.map((label, j) => <label key={label}>{label}<textarea aria-label={`${area} — ${label}`} value={data.answers[i][j]} onChange={e => update(i, j, e.target.value)} /><span className="print-only saved-text">{data.answers[i][j]}</span></label>)}</div>
    </section>)}
    <section><h2>Compare the cases</h2><div className="cards">
      {caseNames.map((name, i) => <div className="panel worksheet-card" key={name}><h3>{name} case</h3>
        <label>Assumptions and likely outcome<textarea aria-label={`${name} case assumptions`} value={data.cases[i].assumptions} onChange={e => updateCase(i, 'assumptions', e.target.value)} /><span className="print-only saved-text">{data.cases[i].assumptions}</span></label>
        <label>Response<textarea aria-label={`${name} case response`} value={data.cases[i].response} onChange={e => updateCase(i, 'response', e.target.value)} /><span className="print-only saved-text">{data.cases[i].response}</span></label>
      </div>)}
    </div></section>
  </>
}
