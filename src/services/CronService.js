import EventConfiguration from '../eventConfiguration'
import { nanoid } from 'nanoid'

export default class CronService {
  constructor(options, id) {
    if (!id) {
      id = nanoid()
    }
    this.options = options
    this.id = id
    this.eventConfigurations = {}
    this.cancelables = {}
    this.started = false
  }

  update(options) {
    this.options = options /* todo, implement update */
  }

  on(options, eventId) {
    if (!eventId) {
      eventId = `CRON/${options.interval}/${this.id}`
    }

    const event = new EventConfiguration(eventId, this, options)
    this.eventConfigurations[event.id] = event
    // lazy run if already running
    if (this.started) {
      const intervalId = this.app.setInterval(() => {
        this.app.handleEvent(event.id)
      }, event.options.interval)
      this.cancelables[event.id] = intervalId
    }
    return event
  }

  removeEvent(event) {
    delete this.eventConfigurations[event.id]
    clearInterval(this.cancelables[event.id])
  }

  start(app) {
    this.app = app
    if (!this.started) {
      Object.values(this.eventConfigurations).forEach((eventConfiguration) => {
        const intervalId = this.app.setInterval(() => {
          this.app.handleEvent(eventConfiguration.id)
        }, eventConfiguration.options.interval)
        this.cancelables[eventConfiguration.id] = intervalId
      })
    }
    this.started = true
  }

  stop() {
    for (const index in this.cancelables) {
      const cancelable = this.cancelables[index]
      clearInterval(cancelable)
    }
  }
}
