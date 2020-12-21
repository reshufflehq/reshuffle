import express, { Express, Request, Response, NextFunction } from 'express'
import { nanoid } from 'nanoid'
import * as availableConnectors from './connectors'
import { MemoryStoreAdapter, PersistentStoreAdapter } from './persistency'
import { BaseConnector, BaseHttpConnector, EventConfiguration } from 'reshuffle-base-connector'
import { createLogger } from './Logger'
import { Logger, LoggerOptions } from 'winston'
import http from 'http'
import fs from 'fs'

function getReshufflePackagesList(directory = __dirname): Record<string, string> {
  const filename = 'package.json'
  const dirSplit = directory.split('/')
  const dir = dirSplit.slice(0, dirSplit.length - 1).join('/')

  try {
    if (fs.readdirSync(dir).includes(filename)) {
      const packageJson = fs.readFileSync(`${dir}/${filename}`, 'utf8')
      return JSON.parse(packageJson).dependencies
    }

    return getReshufflePackagesList(directory + '../')
  } catch (e) {
    return {}
  }
}

export interface Handler {
  handle: (event: any, app: Reshuffle) => void
  id: string
}

export default class Reshuffle {
  availableConnectors: any
  httpDelegates: { [path: string]: any }
  port: number
  registry: {
    connectors: { [url: string]: BaseConnector }
    handlers: { [id: string]: Handler[] }
    common: { webserver?: Express; persistentStore?: any }
  }
  httpServer?: http.Server
  logger: Logger

  constructor(loggerOptions?: LoggerOptions) {
    this.availableConnectors = availableConnectors
    this.port = parseInt(<string>process.env.PORT, 10) || 8000
    this.httpDelegates = {}
    this.registry = { connectors: {}, handlers: {}, common: {} }
    this.logger = createLogger(loggerOptions)

    this.logger.info('Reshuffle Initializing')
  }

  private prepareWebServer(): Express {
    if (!this.registry.common.webserver) {
      this.registry.common.webserver = express()
      this.registry.common.webserver.use(express.json(), express.urlencoded({ extended: true }))
    }

    return this.registry.common.webserver
  }

  register(connector: BaseConnector): Reshuffle {
    connector.app = this
    this.registry.connectors[connector.id] = connector

    return this
  }

  async unregister(connector: BaseConnector): Promise<void> {
    await connector.stop()
    delete this.registry.connectors[connector.id]
  }

  getConnector(connectorId: BaseConnector['id']): BaseConnector {
    return this.registry.connectors[connectorId]
  }

  registerHTTPDelegate(path: string, delegate: BaseHttpConnector): Reshuffle {
    this.httpDelegates[path] = this.httpDelegates[path] || new HttpMultiplexer(path)
    this.httpDelegates[path].delegates.push(delegate)
    return this
  }

  //we might to add a fine tuned method in the future that just removes one delegete
  unregisterHTTPDelegate(path: string): void {
    const httpMultiplexer = this.httpDelegates[path]
    if (httpMultiplexer) {
      httpMultiplexer.delegates = []
    }
  }

  when(eventConfiguration: EventConfiguration, handler: (() => void) | Handler): Reshuffle {
    const handlerWrapper =
      typeof handler === 'object'
        ? handler
        : {
            handle: handler,
            id: nanoid(),
          }
    if (this.registry.handlers[eventConfiguration.id]) {
      this.registry.handlers[eventConfiguration.id].push(handlerWrapper)
    } else {
      this.registry.handlers[eventConfiguration.id] = [handlerWrapper]
    }
    this.logger.info('Reshuffle Registering event', eventConfiguration.id)

    return this
  }

  start(port?: number, callback?: () => void): void {
    this.port = port || this.port

    // Start all connectors
    Object.values(this.registry.connectors).forEach((connector) => connector.start())

    // Start the webserver if we have http delegates
    if (Object.keys(this.httpDelegates).length) {
      const webserver = this.prepareWebServer()

      if (process.env.RESHUFFLE_HEALTH_PATH) {
        webserver.use(process.env.RESHUFFLE_HEALTH_PATH, (req, res) =>
          res.status(200).send({ ok: true, uptime: process.uptime() }),
        )
      }

      if (process.env.RESHUFFLE_PKG_VERSION_PATH) {
        webserver.use(process.env.RESHUFFLE_PKG_VERSION_PATH, (req, res) =>
          res.json(getReshufflePackagesList()),
        )
      }

      const specificPaths = Object.keys(this.httpDelegates).filter((p) => !p.includes(':'))
      const genericPathsOrdered = Object.keys(this.httpDelegates)
        .filter((p) => p.includes(':'))
        .sort()
        .reverse()

      // Moves all generic routes (containing :) at the end,  with /specific/generic first (e.g. /foo/:id before /:bar)
      specificPaths.concat(genericPathsOrdered).forEach((path) => {
        const httpMultiplexer = this.httpDelegates[path]
        webserver.all(path, httpMultiplexer.handle.bind(httpMultiplexer))
      })

      webserver.all('/webhooks/*', (req, res) => {
        const errorMessage = `Webhook not registered`
        this.logger.info(`${errorMessage} for ${req.method} ${req.url}`)
        return res.status(501).send(errorMessage)
      })
      webserver.all('*', (req, res) => {
        const errorMessage = `No handler registered for ${req.method} ${req.url}`
        this.logger.info(errorMessage)
        return res.status(501).send(errorMessage)
      })

      this.httpServer = webserver.listen(this.port, () => {
        this.logger.info('Reshuffle Web server listening on port', this.port)
      })
    }

    callback && callback()
  }

  stopWebServer(): void {
    this.httpServer?.close()
  }

  restart(port?: number): void {
    this.stopWebServer()
    this.start(port, () => {
      this.logger.info('Reshuffle Restarted')
    })
  }

  async handleEvent(eventId: EventConfiguration['id'], event: any): Promise<boolean> {
    const eventHandlers = this.registry.handlers[eventId]
    if (!eventHandlers || eventHandlers.length === 0) {
      return false
    }

    let handled = true
    for (const handler of eventHandlers) {
      handled &&= await this.onHandleEvent(handler, event)
    }

    return handled
  }

  async onHandleEvent(handler: Handler, event: any): Promise<boolean> {
    this.logger.defaultMeta = { handlerId: handler.id }
    try {
      await handler.handle(event, this)
      return true
    } catch (error) {
      this.logger.error(error.stack)
      return false
    } finally {
      this.logger.defaultMeta = {}
    }
  }

  setPersistentStore(adapter: PersistentStoreAdapter) {
    this.registry.common.persistentStore = adapter
    return adapter
  }

  getPersistentStore() {
    return this.registry.common.persistentStore || this.setPersistentStore(new MemoryStoreAdapter())
  }

  getLogger(): Logger {
    return this.logger
  }
}

export { Reshuffle }

class HttpMultiplexer {
  delegates: BaseHttpConnector[]
  originalPath: string
  constructor(originalPath: string) {
    this.originalPath = originalPath
    this.delegates = []
  }
  async handle(req: Request & { originalPath: string }, res: Response, next: NextFunction) {
    req.originalPath = this.originalPath
    let handled = false

    if (this.delegates.length > 0) {
      for (const delegate of this.delegates) {
        if (handled) {
          break
        }
        handled = await delegate.handle(req, res, next)
      }
    }

    if (!handled) {
      next()
    }
  }
}
