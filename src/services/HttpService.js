import EventConfiguration from '../eventConfiguration'
import { nanoid } from 'nanoid'

export default class HttpService {
  constructor(options, id) {
    if (!id) {
      id = nanoid()
    }
    this.id = id
    this.options = options
    this.eventConfigurations = {}
    this.started = false
  }

  update(options) {
    this.options = options
  }

  on(options, eventId) {
    if (!options.path.startsWith('/')) {
      options.path = '/' + options.path
    }
    if (!eventId) {
      eventId = `HTTP/${options.method}${options.path}/${this.id}`
    }

    const event = new EventConfiguration(eventId, this, options)
    this.eventConfigurations[event.id] = event
    this.app.registerHTTPDelegate(event.options.path, this)

    return event
  }

  removeEvent(event) {
    delete this.eventConfigurations[event.id]
  }

  start(app) {
    this.app = app
    if (this.started) {
      Object.values(this.eventConfigurations).forEach((eventConfiguration) =>
        app.registerHTTPDelegate(eventConfiguration.options.path, this),
      )
    }
    this.started = true
  }

  handle(req, res, next) {
    const { method, url } = req
    let handled = false

    const eventConfiguration = Object.values(this.eventConfigurations).find(
      ({ options }) => options.path === url && options.method === method,
    )

    if (eventConfiguration) {
      console.log('Handling event')
      handled = this.app.handleEvent(eventConfiguration.id, { req, res })
    }

    next()

    return handled
  }

  stop() {
    Object.values(this.eventConfigurations).forEach((eventConfiguration) =>
      this.app.unregisterHTTPDelegate(eventConfiguration.options.path),
    )
  }
}
