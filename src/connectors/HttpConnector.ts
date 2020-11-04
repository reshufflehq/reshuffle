import fetch, { RequestInfo, RequestInit } from 'node-fetch'
import { format as _formatURL, URL } from 'url'
import { Request, Response, NextFunction } from 'express'
import { BaseHttpConnector, EventConfiguration } from 'reshuffle-base-connector'
import { error } from 'winston'

class TimeoutError extends Error {}

export interface HttpConnectorConfigOptions {
  authKey?: string
  authScript?: string
}

export interface HttpConnectorEventOptions {
  method: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE' | 'PATCH'
  path: string
}

const sanitizePath = (path: string) => {
  const pathNoQueryParam = path.split('?')[0]
  return pathNoQueryParam.startsWith('/') ? pathNoQueryParam : `/${pathNoQueryParam}`
}

export default class HttpConnector extends BaseHttpConnector<
  HttpConnectorConfigOptions,
  HttpConnectorEventOptions
> {
  on(options: HttpConnectorEventOptions, handler: any, eventId?: string): EventConfiguration {
    const optionsSanitized = { method: options.method, path: sanitizePath(options.path) }

    if (!eventId) {
      eventId = `HTTP/${optionsSanitized.method}${optionsSanitized.path}/${this.id}`
    }

    const event = new EventConfiguration(eventId, this, optionsSanitized)
    this.eventConfigurations[event.id] = event
    this.app.when(event, handler)
    this.app.registerHTTPDelegate(event.options.path, this)

    return event
  }

  async handle(req: any, res: Response, next: NextFunction) {
    const { method } = req
    const requestPath = req.originalPath
    let handled = false

    const eventConfiguration = Object.values(this.eventConfigurations).find(
      ({ options }) => options.path === requestPath && options.method === method,
    )

    if (eventConfiguration) {
      this.app.getLogger().info('Handling event')

      handled = await this.app.handleEvent(eventConfiguration.id, {
        ...eventConfiguration,
        req,
        res,
      })

      if (!handled) {
        res.status(500).send()
        return true // The script threw an exception, we returned a 500 with handled true to avoid calling the next handler.
      }
    }

    return handled
  }

  onStop() {
    Object.values(this.eventConfigurations).forEach((eventConfiguration) =>
      this.app.unregisterHTTPDelegate(eventConfiguration.options.path),
    )
  }

  fetch(url: RequestInfo, options?: RequestInit) {
    return fetch(url, options)
  }

  async fetchWithRetries(url: string, options: RequestInit = {}, retry: Record<string, any> = {}) {
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
