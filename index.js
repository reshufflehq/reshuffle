http = require('http');
const fs = require("fs");
const avilableServices = {};
const util = require('util');


class Reshuffle {
  constructor() {
    this.services = {};
    this.eventNamesToHandlers = {};
    this.shareResources = {};
    this.httpDelegetes = {};
    this.serviceNameToService = {};
    console.log("Initiating Reshuffle");

  }
  
  use(service, service_id) {
    if(service_id){
      service.id = service_id;
    }
    this.services[service.id] = service;
  }

  getService(serviceId) {
    return this.services[serviceId];
  }

  unregisterHTTPDelegate(path, delegate) {
    delete this.httpDelegetes[path];
  }
  registerHTTPDelegate(path, delegate) {
    if (!this.shareResources.webserver) {
      var express = require('express');
      this.shareResources.webserver = express();
      this.shareResources.webserver.route("*")
        .all((function (req, res, next) {
          if (this.httpDelegetes[req.url]) {
            this.httpDelegetes[req.url].handle(req, res, next);
          }
          else {
            res.end("no handler");
          }
        }).bind(this));
    }
    this.httpDelegetes[path] = delegate;
  }

  when(eventName, handler) {
    let handlerWrapper = handler;
    if (!handler.id) {
      handlerWrapper = {
        "handle": handler,
        "id": uuidv4()
      };
    }

    if (this.eventNamesToHandlers[eventName]) {
      this.eventNamesToHandlers[eventName].push(handlerWrapper);
    }
    else {
      this.eventNamesToHandlers[eventName] = [handlerWrapper];
    }
    console.log("Registering event " + eventName);
  }
  start() {
    for (const serviceIndex in this.services) {
      let service = this.services[serviceIndex];
      service.start(this);
    }

    if (this.shareResources.webserver) {
      this.shareResources.webserver.listen(8000);
    }
    console.log("starting Reshuffle");
  }
  handleEvent(eventName, event) {
    if (event == null) {
      event = {};
    }
    event.getService = this.getService.bind(this);
    let eventHandlers = this.eventNamesToHandlers[eventName];
    for (let index = 0; index < eventHandlers.length; index++) {
      const handler = eventHandlers[index];
      this._p_handle(handler, event);
    }
  }
  _p_handle(handler, event) {
    handler.handle(event);
  }
}










function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}





module.exports = {
  Reshuffle: Reshuffle,
};


// register our out of the box Service Connectors and Event Emmiters
avilableServices["CronService"] = module.exports.CronService = require('./lib/cron').CronService
avilableServices["HttpService"] = module.exports.HttpService = require('./lib/http').HttpService
avilableServices["SlackService"] = module.exports.SlackService = require('./lib/slack').SlackService

Reshuffle.prototype.avilableServices = avilableServices;
