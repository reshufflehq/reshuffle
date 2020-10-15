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
      this.prepareWebServer().all(path, httpMultiplexer.handle.bind(httpMultiplexer))
    } else {
      httpMultiplexer.delegates.push(delegate)
    }
    this.httpDelegates[path] = httpMultiplexer
    return this
  }

  //we might to add a fine tuned method in the future that just removes one delegete
  unregisterHTTPDelegate(path: string): void {
    const httpMultoplexer = this.httpDelegates[path]
    if (!httpMultoplexer) {
      httpMultoplexer.delegates = []
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
    if (this.registry.common.webserver) {
      this.httpServer = this.registry.common.webserver.listen(this.port, () => {
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

    for (const handler of eventHandlers) {
      await this.onHandleEvent(handler, event)
    }

    return true
  }

  async onHandleEvent(handler: Handler, event: any): Promise<void> {
    this.logger.defaultMeta = { handlerId: handler.id }
    try {
      await handler.handle(event, this)
    } catch (error) {
      this.logger.error(error.stack)
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
  handle(req: any, res: any, next: any) {
    req.originalPath = this.originalPath
    this.delegates.forEach(async function (delegate) {
      await delegate.handle(req, res, next)
    })
  }
}
