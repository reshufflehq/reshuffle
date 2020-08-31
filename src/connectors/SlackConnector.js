import EventConfiguration from '../EventConfiguration'
import { nanoid } from 'nanoid'

export default class SlackConnector {
  constructor(options, id) {
    if (!id) {
      id = nanoid()
    }
    this.options = options
    this.id = id
    this.eventConfigurations = {}
    this.started = false
  }

  update(options) {
    this.options = options /* todo, implement update */
  }

  on(options, eventId) {
    return new EventConfiguration(eventId, this, {})
  }
  send(message) {
    console.log(message)
  }
  start(app) {
    this.app = app
    this.started = true
  }
  removeEvent(event) {
    delete this.eventConfigurations[event.id]
  }
  stop() {
    console.log('TODO stop')
  }
}
