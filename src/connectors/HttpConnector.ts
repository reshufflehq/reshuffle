import fetch, { RequestInfo, RequestInit } from 'node-fetch'
import { format as _formatURL, URL } from 'url'
import { Request, Response, NextFunction } from 'express'
import Reshuffle from '../Reshuffle'
import { Connector, EventConfiguration } from 'reshuffle-base-connector'

class TimeoutError extends Error {}

export interface HttpConnectorOptions {
  method: string
  path: string
}

export default class HttpConnector extends Connector<HttpConnectorOptions> {
  constructor(options?: HttpConnectorOptions, id?: string) {
    super(options, id)
  }

  on(options: HttpConnectorOptions, eventId: string) {
    if (!options.path.startsWith('/')) {
      options.path = '/' + options.path
    }
    if (!eventId) {
      eventId = `HTTP/${options.method}${options.path}/${this.id}`
    }

    const event = new EventConfiguration(eventId, this, options)
    this.eventConfigurations[event.id] = event
    this.app?.registerHTTPDelegate(event.options.path, this)

    return event
  }

  removeEvent(event: any) {
    delete this.eventConfigurations[event.id]
  }

  start(app: Reshuffle) {
    this.app = app
    if (!this.started) {
      Object.values(this.eventConfigurations).forEach((eventConfiguration) =>
        app.registerHTTPDelegate(eventConfiguration.options.path, this),
      )
    }
    this.started = true
  }

  async handle(req: Request, res: Response, next: NextFunction) {
    const { method, url } = req
    let handled = false

    const eventConfiguration = Object.values(this.eventConfigurations).find(
      ({ options }) => options.path === url && options.method === method,
    )

    if (eventConfiguration) {
      console.log('Handling event')
      handled = this.app ? await this.app.handleEvent(eventConfiguration.id, { req, res }) : false
    }

    next()

    return handled
  }

  public stop() {
    Object.values(this.eventConfigurations).forEach((eventConfiguration) =>
      this.app?.unregisterHTTPDelegate(eventConfiguration.options.path),
    )

    this.started = false
  }

  public fetch(url: RequestInfo, options?: RequestInit) {
    return fetch(url, options)
  }

  public async fetchWithRetries(
    url: string,
    options: RequestInit = {},
    retry: Record<string, any> = {},
  ) {
    const interval = retry.interval !== undefined ? retry.interval : 2000
    if (typeof interval !== 'number' || interval < 50 || 5000 < interval) {
      throw new Error(`Http: Invalid retry interval: ${interval}`)
    }

    const repeat = retry.repeat !== undefined ? retry.repeat : 5
    if (typeof repeat !== 'number' || repeat < 1 || 10 < repeat) {
      throw new Error(`Http: Invalid retry repeat: ${repeat}`)
    }

    const backoff = retry.backoff !== undefined ? retry.backoff : 2
    if (typeof backoff !== 'number' || backoff < 1 || 3 < backoff) {
      throw new Error(`Http: Invalid retry backoff: ${backoff}`)
    }

    let ms = interval
    for (let i = 0; i < repeat; i++) {
      try {
        return await this.fetchWithTimeout(url, options, ms)
      } catch (e) {
        if (!(e instanceof TimeoutError)) {
          throw e
        }
      }
      ms *= backoff
    }

    throw new TimeoutError('Retries timed out')
  }

  fetchWithTimeout(url: string, options: RequestInit, ms: number) {
    if (typeof ms !== 'number' || ms < 1) {
      throw new Error(`Http: Invalid timeout: ${ms}`)
    }

    return new Promise((resolve, reject) => {
      setTimeout(() => reject(new TimeoutError('Timed out')), ms)
      this.fetch(url, options).then(resolve, reject)
    })
  }

  formatURL(components: Record<string, any>) {
    return _formatURL(components)
  }

  parseURL(url: string) {
    return new URL(url)
  }
}
