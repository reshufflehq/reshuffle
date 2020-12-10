import { BaseConnector, EventConfiguration } from 'reshuffle-base-connector'

export interface CustomEventConnectorEventOptions {
  channel: string
  payLoad?: any
}

export default class CustomEventConnector extends BaseConnector<
  null,
  CustomEventConnectorEventOptions
> {
  on(
    options: CustomEventConnectorEventOptions,
    handler: any,
    eventId?: string,
  ): EventConfiguration {
    if (!eventId) {
      eventId = `CustomEvent/${options.channel}/${this.id}`
    }
    const event = new EventConfiguration(eventId, this, options)
    this.eventConfigurations[event.id] = event
    this.app.when(event, handler)

    return event
  }

  async fire(channel: string) {
    const eventId = `CustomEvent/${channel}/${this.id}`
    await this.app.handleEvent(eventId, this.eventConfigurations[eventId])
  }
}
