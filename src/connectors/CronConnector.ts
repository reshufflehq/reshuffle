import { BaseConnector, EventConfiguration } from 'reshuffle-base-connector'
import Timer = NodeJS.Timer
import Reshuffle from '../Reshuffle'

const DEFAULT_EVENT_OPTIONS = { interval: 5000 }

export interface CronEventOptions {
  interval: number
}

export default class CronConnector extends BaseConnector<null, CronEventOptions> {
  intervalsByEventId: { [eventId: string]: Timer }

  constructor(app: Reshuffle, id?: string) {
    super(app, undefined, id)
    this.intervalsByEventId = {}
  }

  on(
    options: CronEventOptions = DEFAULT_EVENT_OPTIONS,
    handler?: any,
    eventId?: string,
  ): EventConfiguration {
    if (!eventId) {
      eventId = `CRON/${options.interval}/${this.id}`
    }

    const event = new EventConfiguration(eventId, this, options)
    this.eventConfigurations[event.id] = event
    if (handler) {
      this.app!.when(event, handler)
    }
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

  onStart() {
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
    Object.values(this.intervalsByEventId).forEach((intervalId: Timer) =>
      this.app?.clearInterval(intervalId),
    )
  }
}
