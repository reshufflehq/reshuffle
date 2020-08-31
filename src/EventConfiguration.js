class EventConfiguration {
  constructor(id, connector, options) {
    this.id = id
    this.connector = connector
    this.options = options
  }

  do(handler) {
    this.connector.app.when(this, handler)
  }
}

export default EventConfiguration
