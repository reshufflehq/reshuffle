import express, { Express, Request, Response, NextFunction } from 'express'
import { nanoid } from 'nanoid'
import * as availableConnectors from './connectors'
import {MemoryStoreAdapter, PersistentStoreAdapter} from './persistency'
import { BaseConnector, BaseHttpConnector, EventConfiguration } from 'reshuffle-base-connector'

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
    common: { webserver?: Express; persistentStore?: any }
  }

  constructor() {
    this.availableConnectors = availableConnectors
    this.port = parseInt(<string>process.env.PORT, 10) || 8000
    this.httpDelegates = {}
    this.registry = { connectors: {}, handlers: {}, common: {} }

    console.log('Initializing Reshuffle')
  }

  createWebServer(): Express {
    this.registry.common.webserver = express()
    this.registry.common.webserver
      .route('*')
      .all(async (req: Request, res: Response, next: NextFunction) => {
        let handled = false
        if (this.httpDelegates[req.url]) {
          handled = await this.httpDelegates[req.url].handle(req, res, next)
        }
        if (!handled) {
          res.end(`No handler registered for ${req.url}`)
        }
      })

    return this.registry.common.webserver
  }

  register(connector: BaseConnector): BaseConnector {
    connector.app = this
    this.registry.connectors[connector.id] = connector

    return connector
  }

  async unregister(connector: BaseConnector): Promise<void> {
    await connector.stop()
    delete this.registry.connectors[connector.id]
  }

  getConnector(connectorId: BaseConnector['id']): BaseConnector {
    return this.registry.connectors[connectorId]
  }

  registerHTTPDelegate(path: string, delegate: BaseHttpConnector): BaseHttpConnector {
    this.httpDelegates[path] = delegate

    return delegate
  }

  unregisterHTTPDelegate(path: string): void {
    delete this.httpDelegates[path]
  }

  when(eventConfiguration: EventConfiguration, handler: () => void | Handler): void {
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
    console.log('Registering event ' + eventConfiguration.id)
  }

  start(port?: number, callback?: () => void): void {
    this.port = port || this.port

    // Start all connectors
    Object.values(this.registry.connectors).forEach((connector) => connector.start(this))

    // Start the webserver if we have http delegates
    if (Object.keys(this.httpDelegates).length > 0 && !this.registry.common.webserver) {
      const webserver = this.createWebServer()

      webserver.listen(this.port, () => {
        console.log(`Web server listening on port ${this.port}`)
      })
    }

    callback && callback()
  }

  restart(port?: number): void {
    this.start(port, () => {
      console.log('Refreshing Reshuffle configuration')
    })
  }

  async handleEvent(eventId: string, event: any): Promise<boolean> {
    if (event == null) {
      event = {}
    }

    const eventHandlers = this.registry.handlers[eventId]
    if (eventHandlers.length === 0) {
      return false
    }

    event.getPersistentStore = this.getPersistentStore.bind(this)
    event.getConnector = this.getConnector.bind(this)

    for (const handler of eventHandlers) {
      await this._p_handle(handler, event)
    }

    return true
  }

  async _p_handle(handler: Handler, event: any): Promise<void> {
    await handler.handle(event)
  }

  setPersistentStore(adapter: PersistentStoreAdapter) {
    this.registry.common.persistentStore = adapter;
    return adapter;
  }

  getPersistentStore() {

    if(this.registry.common.persistentStore){
      this.registry.common.persistentStore = new MemoryStoreAdapter();
    }
    return this.registry.common.persistentStore;
  }

  public clearInterval(intervalID: NodeJS.Timer): void {
    global.clearInterval(intervalID)
  }

  public setInterval(callback: (...args: any[]) => void, ms: number, ...args: any[]): NodeJS.Timer {
    return global.setInterval(callback, ms, args)
  }
}

export { Reshuffle }
