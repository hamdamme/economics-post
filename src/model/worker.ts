import { run } from './simulation.ts'

self.addEventListener('message', (event: MessageEvent<unknown>) => {
  try {
    self.postMessage({ result: run(event.data) })
  } catch (error) {
    self.postMessage({ error: (error as Error).message })
  }
})
