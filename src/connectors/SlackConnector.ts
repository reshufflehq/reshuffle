import { BaseConnector, EventConfiguration } from 'reshuffle-base-connector'
import Reshuffle from '../Reshuffle'

export default class SlackConnector extends BaseConnector {
  on(options: any, eventId: EventConfiguration['id']) {
    return new EventConfiguration(eventId, this, {})
  }
  send(message: string) {
    console.log(message)
  }
  start(app: Reshuffle) {
    this.app = app
    this.started = true
  }
  removeEvent(event: EventConfiguration) {
    delete this.eventConfigurations[event.id]
  }
  stop() {
    console.log('TODO stop')
  }
}
