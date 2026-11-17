import { defaults, type Config } from '../model/simulation.ts'

export const comparisons: { id: string; title: string; description: string; arms: { label: string; config: Config }[] }[] = [
  { id: 'entry', title: 'Does entry erode profits?', description: 'Fixed demand and identical small plants. Change only whether informed founders can enter.',
    arms: [{ label: 'Entry allowed', config: defaults }, { label: 'Entry unavailable', config: { ...defaults, entry: false } }] },
  { id: 'learning', title: 'Who hears the news?', description: 'Both awareness channels start at the same shares in every arm. One arm accelerates customer learning with founder diffusion frozen. A second accelerates founder learning with customer demand fixed.',
    arms: [
      { label: 'Neither channel diffuses', config: { ...defaults, alpha: 50, founderRate: 0 } },
      { label: 'Customer learning only', config: { ...defaults, alpha: 50, customerRate: 0.22, founderRate: 0 } },
      { label: 'Founder learning only', config: { ...defaults, alpha: 50, founderRate: 0.22 } },
    ] },
  { id: 'capacity', title: 'When does new capacity arrive?', description: 'Same demand, small-to-large plant menu, review dates and 150 MU transition payment. Only resize delivery time changes.',
    arms: [
      { label: 'One-period delivery', config: { ...defaults, A: 260, initialFirms: 8, entry: false, resize: true, resizeDelay: 1 } },
      { label: 'Four-period delivery', config: { ...defaults, A: 260, initialFirms: 8, entry: false, resize: true, resizeDelay: 4 } },
    ] },
  { id: 'reversal', title: 'What if demand reverses?', description: 'Entry takes four periods in both paths. In one path, the demand intercept falls by 75 MU/unit in period 6, after founders have made commitments with no knowledge of the future shock.',
    arms: [
      { label: 'Stable demand', config: { ...defaults, entryDelay: 4, entryCost: 150 } },
      { label: 'Demand falls at period 6', config: { ...defaults, entryDelay: 4, entryCost: 150, shockAt: 6, shockAmount: -75 } },
    ] },
]
