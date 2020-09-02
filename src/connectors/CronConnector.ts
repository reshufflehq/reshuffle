import { BaseConnector, EventConfiguration } from 'reshuffle-base-connector'
import Timer = NodeJS.Timer
import Reshuffle from '../Reshuffle'

const DEFAULT_CRON_OPTIONS = { interval: 5000 }

export interface CronConnectorOptions {
  interval: number
}

export default class CronConnector extends BaseConnector<CronConnectorOptions> {
  intervalsByEventId: { [eventId: string]: Timer }

  constructor(options: CronConnectorOptions = DEFAULT_CRON_OPTIONS, id: string) {
    super(options, id)
    this.intervalsByEventId = {}
  }

  on(options: CronConnectorOptions, eventId: string) {
    if (!eventId) {
      eventId = `CRON/${options.interval}/${this.id}`
    }

    const event = new EventConfiguration(eventId, this, options)
    this.eventConfigurations[event.id] = event

    // lazy run if already running
    if (this.started && this.app) {
      const intervalId = this.app.setInterval(() => {
        this.app?.handleEvent(event.id, event)
      }, event.options.interval)
      this.intervalsByEventId[event.id] = intervalId
    }
    return event
  }

  onRemoveEvent(event: EventConfiguration) {
    this.app?.clearInterval(this.intervalsByEventId[event.id])
  }

  onStart(app: Reshuffle) {
    Object.values(this.eventConfigurations).forEach((eventConfiguration) => {
      const intervalId = this.app?.setInterval(() => {
        this.app?.handleEvent(eventConfiguration.id, {})
      }, eventConfiguration.options.interval)
      if (intervalId) {
        this.intervalsByEventId[eventConfiguration.id] = intervalId
      }
    })
  }

  onStop() {
    Object.values((intervalId: Timer) => clearInterval(intervalId))
  }
}
