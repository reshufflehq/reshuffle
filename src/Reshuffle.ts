import express, { Express, Request, Response, NextFunction } from 'express'
import { nanoid } from 'nanoid'
import * as availableConnectors from './connectors'
import { MemoryStoreAdapter, PersistentStoreAdapter } from './persistency'
import { BaseConnector, BaseHttpConnector, EventConfiguration } from 'reshuffle-base-connector'
import { createLogger } from './Logger'
import { Logger, LoggerOptions } from 'winston'
import http from 'http'

export interface Handler {
  handle: (event?: any) => void
  id: string
}

export default class Reshuffle {
  availableConnectors: any
  httpDelegates: { [path: string]: BaseHttpConnector }
  port: number
  registry: {
    connectors: { [url: string]: BaseConnector }
    handlers: { [id: string]: Handler[] }
    common: { webserver?: http.Server; persistentStore?: any }
  }
  logger: Logger

  constructor(loggerOptions?: LoggerOptions) {
    this.availableConnectors = availableConnectors
    this.port = parseInt(<string>process.env.PORT, 10) || 8000
    this.httpDelegates = {}
    this.registry = { connectors: {}, handlers: {}, common: {} }
    this.logger = createLogger(loggerOptions)

    this.logger.info('Initializing Reshuffle')
  }

  prepareWebServer(): Express {
    const server = express()
    server.use(express.json(), express.urlencoded({ extended: true }))
    server.route('*').all(async (req: Request, res: Response, next: NextFunction) => {
      let handled = false
      if (this.httpDelegates[req.params[0]]) {
        handled = await this.httpDelegates[req.params[0]].handle(req, res, next)
      }
      if (!handled) {
        res.end(`No handler registered for ${req.url}`)
      }
    })

    return server
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
    this.httpDelegates[path] = delegate

    return this
  }

  unregisterHTTPDelegate(path: string): void {
    delete this.httpDelegates[path]
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
    if (Object.keys(this.httpDelegates).length > 0 && !this.registry.common.webserver) {
      const express = this.prepareWebServer()

      this.registry.common.webserver = express.listen(this.port, () => {
        this.logger.info(`Web server listening on port ${this.port}`)
      })
    }

    callback && callback()
  }

  stopWebServer(): void {
    this.registry.common.webserver?.close()
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

    event.getPersistentStore = this.getPersistentStore.bind(this)
    event.getConnector = this.getConnector.bind(this)

    for (const handler of eventHandlers) {
      await this.onHandleEvent(handler, event)
    }

    return true
  }

  async onHandleEvent(handler: Handler, event: any): Promise<void> {
    this.logger.defaultMeta = { handlerId: handler.id }
    try {
      await handler.handle(event)
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

  public getLogger(): Logger {
    return this.logger
  }
}

export { Reshuffle }
