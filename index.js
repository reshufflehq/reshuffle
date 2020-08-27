const { nanoid } = require('nanoid');
const express = require('express');

class Reshuffle {
  constructor() {
    this.registry = {
      services : {},
      handlers : {},
      common : {}
    };
    this.httpDelegates = {};
    this.port = process.env.RESHUFFLE_PORT || 8000;

    console.log('Initializing Reshuffle');
  }

  setPersistentStore(persistantStore){
    this.registry.common.persistantStore = persistantStore;
  }

  getPersistentStore(){
    return this.registry.common.persistantStore;
  }

  createWebServer() {
    this.registry.common.webserver = express();
    this.registry.common.webserver.route('*')
        .all((req, res, next) => {
          let handled = false
          if (this.httpDelegates[req.url]) {
            handled = this.httpDelegates[req.url].handle(req, res, next);
          }
          if (!handled) {
            res.end(`No handler registered for ${req.url}`);
          }
        });
  }
  
  register(service) {
    service.app = this;
    this.registry.services[service.id] = service;  
  }

  async unregister(service) {
    await service.stop()
    delete this.registry.services[service.id];
  }

  getService(serviceId) {
    return this.registry.services[serviceId];
  }

  registerHTTPDelegate(path, delegate) {
    this.httpDelegates[path] = delegate;
  }

  unregisterHTTPDelegate(path) {
    delete this.httpDelegates[path];
  }

  when(eventConfiguration, handler) {
    let handlerWrapper = handler;
    if (!handler.id) {
      handlerWrapper = {
        'handle': handler,
        'id': nanoid()
      };
    }
    if (this.registry.handlers[eventConfiguration.id]) {
      this.registry.handlers[eventConfiguration.id].push(handlerWrapper);
    }
    else {
      this.registry.handlers[eventConfiguration.id] = [handlerWrapper];
    }
    console.log('Registering event ' + eventConfiguration.id);
  }

  start(port, callback = () => { console.log('Reshuffle started!')}) {
    this.port = port || this.port;

    // Start all services
    Object.values(this.registry.services).forEach(service => service.start(this))

    // Start the webserver if we have http delegates
    if(Object.keys(this.httpDelegates).length > 0 && !this.registry.common.webserver) {
      this.createWebServer();
      this.registry.common.webserver.listen(this.port ,() => {
        console.log(`Web server listening on port ${this.port}`)
      });
    }

    callback && callback();
  }

  restart(port) {
    this.start(port, () => { console.log('Refreshing Reshuffle configuration')});
  }
  
  handleEvent(eventName, event) {
    if (event == null) {
      event = {};
    }
    
    const eventHandlers = this.registry.handlers[eventName];
    if(eventHandlers.length === 0){
      return false;
    }
    event.getService = this.getService.bind(this);
    event.getPersistentStore = this.getPersistentStore.bind(this);
    
    eventHandlers.forEach(handler => {
      this._p_handle(handler, event);
    });
   
    return true;
  }

  _p_handle(handler, event) {
    handler.handle(event);
  }
}

module.exports = {
  Reshuffle,
  CronService: require('./lib/cron').CronService,
  HttpService: require('./lib/http').HttpService,
  SlackService: require('./lib/slack').SlackService,
  EventConfiguration: require('./lib/eventConfiguration').EventConfiguration,
  SQLStoreStategy: require('./lib/sqlStoreStategy').SQLStoreStategy
};