http = require('http');
const fs = require("fs");
const avilableServices = {};
const util = require('util');


function Reshuffle() {
  this.eventsNameToServices = {};
  this.eventNamesToHandlers = {};
  this.shareResources = {};
  this.httpDelegetes = {};
  this.serviceNameToService = {};
  console.log("Initiating Reshuffle");

}

Reshuffle.prototype.addEvent = function addEvent(eventName, service) {
  if (this.eventsNameToServices[eventName]) {
    this.eventsNameToServices[eventName].push(service);
  } else {
    this.eventsNameToServices[eventName] = [service];
  }
  // todo: make sure all services can handle multipule event names
  service.addEventName(eventName);
}


Reshuffle.prototype.addService = function addService(serviceName, service) {
  this.serviceNameToService[serviceName] = service;
  service.addServiceName(serviceName, this);
}

Reshuffle.prototype.getService = function getService(serviceName) {
  return this.serviceNameToService[serviceName] ;
}

Reshuffle.prototype.unregisterHTTPDelegate = function unregisterHTTPDelegate(path, delegate) {
  delete this.httpDelegetes[path];
}

Reshuffle.prototype.registerHTTPDelegate = function registerHTTPDelegate(path, delegate) {
  if (!this.shareResources.webserver) {
    var express = require('express');
    this.shareResources.webserver = express();
    this.shareResources.webserver.route("*")
    .all((function (req, res, next) {
      if(this.httpDelegetes[req.url]){
        this.httpDelegetes[req.url].handle(req, res, next);
      }else{
        res.end("no handler")
      }
    }).bind(this))
  }
  this.httpDelegetes[path] = delegate;
}


Reshuffle.prototype.when = function when(eventName, handler) {
  let handlerWrapper = handler;
  if(!handler.id){
    handlerWrapper = {
      "handle": handler,
      "id": uuidv4()
    }
  }
  
  if (this.eventNamesToHandlers[eventName]) {
    this.eventNamesToHandlers[eventName].push(handlerWrapper);
  } else {
    this.eventNamesToHandlers[eventName] = [handlerWrapper];
  }
  console.log("Registering event " + eventName);
};


function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

Reshuffle.prototype.start = function start() {
  for (const eventName in this.eventsNameToServices) {
    const services = this.eventsNameToServices[eventName];
    for (const serviceIndex in services) {
      let service = services[serviceIndex];
      service.start(this);
    }
  };
  if (this.shareResources.webserver) {
    this.shareResources.webserver.listen(8000);
  }
  console.log("starting Reshuffle");
};

Reshuffle.prototype.handleEvent = function handleEvent(eventName, event) {
  if(event == null){
    event = {}
  }
  event.getService = this.getService.bind(this);
  let eventHandlers = this.eventNamesToHandlers[eventName]
  for (let index = 0; index < eventHandlers.length; index++) {
    const hander = eventHandlers[index];
    hander.handle(event);
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
