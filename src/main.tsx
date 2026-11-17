import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { chapters } from './content/chapters'
import { Home, Glossary, Learn, Methods } from './pages/Reading'
import { Benchmark, ShopPage } from './pages/StaticLabs'
import { ComparePage, LabPage } from './pages/Simulation'
import { Worksheet } from './pages/Worksheet'
import '@fontsource/instrument-sans/latin-400.css'
import '@fontsource/instrument-sans/latin-600.css'
import '@fontsource/instrument-sans/latin-700.css'
import '@fontsource/instrument-serif/latin-400.css'
import '@fontsource/instrument-serif/latin-400-italic.css'
import './style.css'

const navigation = [
  ['Learn', 'learn'], ['Maya’s shop', 'shop'], ['Market lab', 'lab'],
  ['Compare', 'compare'], ['Worksheet', 'worksheet'], ['Methods', 'methods'],
]

function App() {
  const [hash, setHash] = useState(location.hash)
  const main = useRef<HTMLElement>(null)
  useEffect(() => {
    const handle = () => {
      if (!location.hash.startsWith('#/') && location.hash !== '') return
      setHash(location.hash)
      window.scrollTo({ top: 0 })
      main.current?.focus({ preventScroll: true })
    }
    window.addEventListener('hashchange', handle)
    return () => window.removeEventListener('hashchange', handle)
  }, [])
  const [, route, argument = ''] = hash.split('/')
  const chapter = Math.min(chapters.length, Math.max(1, Number(argument) || 1))
  const page = (() => {
    switch (route) {
      case 'learn': return <Learn index={Math.trunc(chapter) - 1} key={chapter} />
      case 'shop': return <ShopPage />
      case 'lab': return <LabPage shared={argument} key={argument} />
      case 'market': return <Benchmark />
      case 'compare': return <ComparePage selected={argument} />
      case 'worksheet': return <Worksheet />
      case 'methods': return <Methods />
      case 'glossary': return <Glossary />
      default: return <Home />
    }
  })()
  return <>
    <a className="skip" href="#main" onClick={event => { event.preventDefault(); main.current?.focus() }}>Skip to content</a>
    <header className="masthead"><div className="masthead-inner">
      <a className="brand" href="#/" aria-label="From Opportunity to Equilibrium home"><span aria-hidden="true">↗</span> Opportunity to Equilibrium</a>
      <nav aria-label="Main navigation">{navigation.map(([label, path]) => <a key={path} href={`#/${path}`} aria-current={route === path || (path === 'lab' && route === 'market') || (path === 'learn' && route === 'glossary') ? 'page' : undefined}>{label}</a>)}</nav>
    </div></header>
    <main id="main" tabIndex={-1} ref={main}>{page}</main>
    <footer><div><span>From Opportunity to Equilibrium</span><p className="small">Synthetic educational examples · CC BY 4.0 text and diagrams · MIT code</p></div><nav aria-label="Footer"><a href="#/methods">Sources</a><a href="https://github.com/hamdamme/economics-post">Source code</a><a href="https://www.hamdam.me/">Hamdam’s website ↗</a></nav></footer>
  </>
}
createRoot(document.getElementById('root')!).render(<App />)
