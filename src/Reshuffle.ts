import express, { Express, Request, Response, NextFunction } from 'express'
import { nanoid } from 'nanoid'
import * as availableServices from './services'
import EventConfiguration from './eventConfiguration'
import { PersistentStore, PersistentStoreAdapter } from './persistency'

export interface Service {
  id: number
  app: Reshuffle
  start: (app: Reshuffle) => void
  stop: () => void
  handle?: any
}

export interface Handler {
  handle: (event?: any) => void
  id: string
}

export default class Reshuffle {
  availableServices: any
  httpDelegates: { [path: string]: Service }
  port: number
  registry: {
    services: { [url: string]: Service }
    handlers: { [id: string]: Handler[] }
    common: { webserver?: Express; persistentStore?: any }
  }

  constructor() {
    this.availableServices = availableServices
    this.port = parseInt(<string>process.env.PORT, 10) || 8000
    this.httpDelegates = {}
    this.registry = { services: {}, handlers: {}, common: {} }

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

  register(service: Service): Service {
    service.app = this
    this.registry.services[service.id] = service

    return service
  }

  async unregister(service: Service): Promise<void> {
    await service.stop()
    delete this.registry.services[service.id]
  }

  getService(serviceId: Service['id']): Service {
    return this.registry.services[serviceId]
  }

  registerHTTPDelegate(path: string, delegate: Service): Service {
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

  start(
    port: number,
    callback = () => {
      console.log('Reshuffle started!')
    },
  ): void {
    this.port = port || this.port

    // Start all services
    Object.values(this.registry.services).forEach((service) => service.start(this))

    // Start the webserver if we have http delegates
    if (Object.keys(this.httpDelegates).length > 0 && !this.registry.common.webserver) {
      const webserver = this.createWebServer()

      webserver.listen(this.port, () => {
        console.log(`Web server listening on port ${this.port}`)
      })
    }

    callback && callback()
  }

  restart(port: number): void {
    this.start(port, () => {
      console.log('Refreshing Reshuffle configuration')
    })
  }

  async handleEvent(eventName: string, event: any): Promise<boolean> {
    if (event == null) {
      event = {}
    }

    const eventHandlers = this.registry.handlers[eventName]
    if (eventHandlers.length === 0) {
      return false
    }

    event.getPersistentStore = this.getPersistentStore.bind(this)
    event.getService = this.getService.bind(this)

    for (const handler of eventHandlers) {
      await this._p_handle(handler, event)
    }

    return true
  }

  async _p_handle(handler: Handler, event: any): Promise<void> {
    await handler.handle(event)
  }

  setPersistentStore(adapter: PersistentStoreAdapter) {
    const ps = new PersistentStore(adapter)
    this.registry.common.persistentStore = ps
    return ps
  }

  getPersistentStore() {
    return this.registry.common.persistentStore
  }
}
