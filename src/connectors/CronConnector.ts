import { BaseConnector, EventConfiguration, Handler } from 'reshuffle-base-connector'
import cron from 'node-cron'
import { nanoid } from 'nanoid'
import Reshuffle from '../Reshuffle'

export interface CronEventOptions {
  expression: string
  timezone?: cron.ScheduleOptions['timezone']
}

export default class CronConnector extends BaseConnector<null, CronEventOptions> {
  tasksByEventId: { [eventId: string]: cron.ScheduledTask }

  constructor(app: Reshuffle, id?: string) {
    super(app, null, id)
    this.tasksByEventId = {}
  }

  on(options: CronEventOptions, handler: Handler, eventId?: string): EventConfiguration {
    if (!eventId) {
      eventId = `CRON/${this.id}/${eventId ? eventId : nanoid()}`
    }

    const event = new EventConfiguration(eventId, this, options)
    this.eventConfigurations[event.id] = event
    if (handler) {
      this.app.when(event, handler)
    }
    const task = cron.schedule(
      event.options.expression,
      () => this.app.handleEvent(event.id, event),
      { timezone: event.options.timezone, scheduled: false },
    )
    this.tasksByEventId[event.id] = task
    this.started && this.onStart()
    return event
  }

  onRemoveEvent(event: EventConfiguration): void {
    this.tasksByEventId[event.id]?.destroy()
  }

  onStart(): void {
    Object.values(this.tasksByEventId).forEach((task) => task.start())
  }

  onStop(): void {
    Object.values(this.tasksByEventId).forEach((task) => task.stop())
  }
}
