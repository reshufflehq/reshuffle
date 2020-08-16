const {EventConfiguration} = require("./eventConfiguration");
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
  }
  
  on(options, event_id) {
    if(!event_id){
      event_id = `HTTP/${options.method}/${options.path}/${this.id}`
    }
    if (!options.path.startsWith('/')) {
      options.path = '/' + options.path;
    }

    let event = new EventConfiguration(event_id, this, options);
    this.eventConfigurations[event.id] = event;
    
    return event;
  }

  start(app) {
    this.app = app;
    for (const index in this.eventConfigurations) {
      let eventConfiguration = this.eventConfigurations[index];
      app.registerHTTPDelegate(eventConfiguration.options.path, this);
    }
    
  }
  handle(req, res, next) {
    let method = req.method;
    let path = req.url;
    let handled = false;
    for (const index in this.eventConfigurations) {
      let eventConfiguration = this.eventConfigurations[index];
      if(eventConfiguration.options.path === path &&  eventConfiguration.options.method === method){
        console.log("HTTP got called, firing event");
        handled = true;
        this.app.handleEvent(eventConfiguration.id, { "req": req, "res": res });
      }
    }

    if (!handled) next();
  }
  stop() {
    //this.app.unregisterHTTPDelegate(this.path, this);
  }
}


module.exports = {
  HttpService: HttpService,
}