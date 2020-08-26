const {EventConfiguration} = require('./eventConfiguration');
const { nanoid } = require('nanoid');

class HttpService {
  constructor(options, id) {
    if(!id){
      id = nanoid();
    }
    this.id = id;
    this.options = options;
    this.eventConfigurations = {};
    this.started = false;
  }

  update(options){this.options = options;}
  
  on(options, event_id) {
    if (!options.path.startsWith('/')) {
      options.path = '/' + options.path;
    }
    if(!event_id){
      event_id = `HTTP/${options.method}${options.path}/${this.id}`
    }

    const event = new EventConfiguration(event_id, this, options);
    this.eventConfigurations[event.id] = event;
    this.app.registerHTTPDelegate(event.options.path, this);
    
    return event;
  }

  removeEvent(event){
    delete this.eventConfigurations[event.id];
  }

  start(app) {
    this.app = app;
    if(this.started){
      for (const index in this.eventConfigurations) {
        const eventConfiguration = this.eventConfigurations[index];
        app.registerHTTPDelegate(eventConfiguration.options.path, this);
      }
    }
    this.started = true;
  }

  handle(req, res, next) {
    const {method, url} = req;
    const eventConfiguration = Object.values(this.eventConfigurations)
        .find(({options}) => options.path === url && options.method === method)

    if (eventConfiguration) {
      console.log('Handling event');
      this.app.handleEvent(eventConfiguration.id, { req, res });
    }

    next();
  }

  stop() {
    for (const index in this.eventConfigurations) {
      const eventConfiguration = this.eventConfigurations[index];
      this.app.unregisterHTTPDelegate(eventConfiguration.options.path)
    }
  }
}

module.exports = {
  HttpService,
}