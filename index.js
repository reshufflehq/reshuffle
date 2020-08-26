const { nanoid } = require('nanoid');

class Reshuffle {
  constructor() {
    this.registry = {
      services : {},
      handlers : {},
      common : {
        webserverStarted : false,
      }
    };
    this.httpDelegates = {};
    this.port = process.env.RESHUFFLE_PORT || 8000;
    console.log('Initializing Reshuffle');
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
    if (!this.registry.common.webserver) {
     var express = require('express');
      this.registry.common.webserver = express();
      this.registry.common.webserver.route('*')
        .all((req, res, next) => {
          if (this.httpDelegates[req.url]) {
           this.httpDelegates[req.url].handle(req, res, next);
          } else {
            res.end(`No handler registered for ${req.url}`);
          }
        });
    }
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

  start(port, callback) {
    this.port = port || this.port;
    
    for (const serviceIndex in this.registry.services) {
      let service = this.registry.services[serviceIndex];
      if(!service.started){
        service.start(this);
        service.started = true;
      }
    }

    if (this.registry.common.webserver && !this.registry.common.webserverStarted){
      this.registry.common.webserver.listen(this.port ,() => {
        this.registry.common.webserverStarted = true;
     });
    }
    if (callback) callback();
  }

  restart(port) {
    this.start(port, () => { console.log('Refreshing Reshuffle configuration')});
  }
  
  handleEvent(eventName, event) {
    if (event == null) {
      event = {};
    }
    
    let eventHandlers = this.registry.handlers[eventName];
    if(eventHandlers.length == 0){
      return false;
    }
    event.getService = this.getService.bind(this);
    
    eventHandlers.forEach(handler => {
      handler.handle(event);
    });
   
    return true;
  }
  
}

module.exports = {
  Reshuffle: Reshuffle,
  EventConfiguration : require('./lib/eventConfiguration').EventConfiguration,
};