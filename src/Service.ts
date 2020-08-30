import { nanoid } from 'nanoid'
import objhash from 'object-hash'
import Reshuffle from './Reshuffle'
import EventConfiguration from './EventConfiguration'

export type Options = Record<string, any>
export type EventFilter = (ec: EventConfiguration) => boolean
export type EventMapper = (ec: EventConfiguration) => any

type EventConfigurationSet = Record<string, EventConfiguration>

const defaultEventFilter = () => true

export class Service {
  protected app?: Reshuffle
  protected eventConfigurationSet: EventConfigurationSet = {}

  constructor(options: Options, protected id = nanoid()) {}

  protected addEvent(eventOptions: any, eventId: string | Record<string, any>): EventConfiguration {
    const id =
      typeof eventId == 'string'
        ? eventId
        : `${this.constructor.name}:${objhash(eventId)}:${this.id}`

    const ec = new EventConfiguration(id, this, eventOptions)
    this.eventConfigurationSet[ec.id] = ec
    return ec
  }

  public removeEvent(ec: EventConfiguration) {
    delete this.eventConfigurationSet[ec.id]
  }

  protected mapEvents(mapper: EventMapper): any[] {
    return Object.values(this.eventConfigurationSet)
      .map(mapper)
      .sort()
      .filter((e, i, a) => i === a.indexOf(e)) // unique
  }

  protected async fire(events: any[], filter: EventFilter = defaultEventFilter) {
    const ecs = Object.values(this.eventConfigurationSet).filter(filter)
    for (const ec of ecs) {
      for (const ev of events) {
        await this.app!.handleEvent(ec.id, ev)
      }
    }
  }

  public start(app: Reshuffle) {
    this.app = app
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public stop() {}
}
