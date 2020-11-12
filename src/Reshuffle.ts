import express, { Express, Request, Response, NextFunction } from 'express'
import { nanoid } from 'nanoid'
import * as availableConnectors from './connectors'
import { MemoryStoreAdapter, PersistentStoreAdapter } from './persistency'
import { BaseConnector, BaseHttpConnector, EventConfiguration } from 'reshuffle-base-connector'
import { createLogger } from './Logger'
import { Logger, LoggerOptions } from 'winston'
import http from 'http'

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

    this.logger.info('Initializing Reshuffle')
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
    let httpMultiplexer = this.httpDelegates[path]
    if (!httpMultiplexer) {
      httpMultiplexer = new HttpMultiplexer(path)
      httpMultiplexer.delegates.push(delegate)
    } else {
      httpMultiplexer.delegates.push(delegate)
    }
    this.httpDelegates[path] = httpMultiplexer
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
    this.logger.info('Registering event ' + eventConfiguration.id)

    return this
  }

  start(port?: number, callback?: () => void): void {
    this.port = port || this.port

    // Start all connectors
    Object.values(this.registry.connectors).forEach((connector) => connector.start())

    // Start the webserver if we have http delegates
    if (Object.keys(this.httpDelegates).length) {
      const webserver = this.prepareWebServer()
      Object.keys(this.httpDelegates)
        .sort()
        .reverse() // The sort().reverse() moves all generic routes (/:id) at the end
        .forEach((path) => {
          const httpMultiplexer = this.httpDelegates[path]
          webserver.all(path, httpMultiplexer.handle.bind(httpMultiplexer))
        })

      if (process.env.HEALTH_CHECK_PATH) {
        webserver.use(process.env.HEALTH_CHECK_PATH, (req, res) =>
          res.status(200).send({ ok: true, uptime: process.uptime() }),
        )
      }
      webserver.all('*', (req, res) => {
        const errorMessage = `No handler registered for ${req.method} ${req.url}`
        this.logger.info(errorMessage)
        return res.status(501).send(errorMessage)
      })

      this.httpServer = webserver.listen(this.port, () => {
        this.logger.info(`Web server listening on port ${this.port}`)
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
      this.logger.info('Refreshing Reshuffle configuration')
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
  async handle(req: any, res: any, next: any) {
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
