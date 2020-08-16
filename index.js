http = require('http');
const fs = require("fs");
const avilableServices = {};
const util = require('util');
const { nanoid } = require('nanoid');

class Reshuffle {
  constructor() {
    this.services = {};
    this.eventIdsToHandlers = {};
    this.shareResources = {};
    this.httpDelegetes = {};
    this.serviceNameToService = {};
    console.log("Initiating Reshuffle");

  }
  
  use(service, service_id) {
    service.app = this;
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

  when(eventConsiguration, handler) {
    let handlerWrapper = handler;
    if (!handler.id) {
      handlerWrapper = {
        "handle": handler,
        "id": nanoid()
      };
    }

    if (this.eventIdsToHandlers[eventConsiguration.id]) {
      this.eventIdsToHandlers[eventConsiguration.id].push(handlerWrapper);
    }
    else {
      this.eventIdsToHandlers[eventConsiguration.id] = [handlerWrapper];
    }
    console.log("Registering event " + eventConsiguration.id);
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
    let eventHandlers = this.eventIdsToHandlers[eventName];
    for (let index = 0; index < eventHandlers.length; index++) {
      const handler = eventHandlers[index];
      this._p_handle(handler, event);
    }
  }
  _p_handle(handler, event) {
    handler.handle(event);
  }
}

module.exports = {
  Reshuffle: Reshuffle,
};


// register our out of the box Service Connectors and Event Emmiters
avilableServices["CronService"] = module.exports.CronService = require('./lib/cron').CronService
avilableServices["HttpService"] = module.exports.HttpService = require('./lib/http').HttpService
avilableServices["SlackService"] = module.exports.SlackService = require('./lib/slack').SlackService

Reshuffle.prototype.avilableServices = avilableServices;
