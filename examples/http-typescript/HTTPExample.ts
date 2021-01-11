import { HttpConnector, Reshuffle } from 'reshuffle'
import type { Request, Response } from 'express'

const app = new Reshuffle()
const connector = new HttpConnector(app)

connector.on(
  { method: 'GET', path: '/test' },
  (event: { req: Request; res: Response }, app: Reshuffle) => {
    event.res.end('Hello World!')
  },
)

connector.on(
  { method: 'GET', path: '/:id' },
  (event: { req: Request; res: Response }, app: Reshuffle) => {
    event.res.end(`Generic handler for: ${event.req.url}`)
  },
)

app.start()
