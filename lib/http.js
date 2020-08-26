const {EventConfiguration} = require('./eventConfiguration');
const { nanoid } = require('nanoid');

class HttpService {
  constructor(options, id) {
    if(!id){
      id = nanoid();
    }
    this.id = id;
    this.options = options;
    this.app;
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
        let eventConfiguration = this.eventConfigurations[index];
        app.registerHTTPDelegate(eventConfiguration.options.path, this);
      }
    }
    this.started = true;
  }

  handle(req, res, next) {
    let method = req.method;
    let path = req.url;
    let handled = false;
    for (const index in this.eventConfigurations) {
      let eventConfiguration = this.eventConfigurations[index];
      if (eventConfiguration.options.path === path &&  eventConfiguration.options.method === method) {
        console.log("Handling event");
        handled = this.app.handleEvent(eventConfiguration.id, { "req": req, "res": res });
      }
    }

    next();
  }

  stop() {
    for (const index in this.eventConfigurations) {
      let eventConfiguration = this.eventConfigurations[index];
      this.app.unregisterHTTPDelegate(eventConfiguration.options.path)
    }
  }
}

module.exports = {
  HttpService: HttpService,
}