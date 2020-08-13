function HttpService(method, path){
  this.method  = method;
  this.path = path
  this.eventNames = [];
  this.app;
}

HttpService.prototype.addEventName = function addEventName(eventName) {
  this.eventNames.push(eventName);
}



HttpService.prototype.on = function on(options) {
  this.method  = options.method;
  this.path = options.path
  if(!this.path.startsWith('/')){
    this.path = '/'+this.path
  }
  return this;
};

HttpService.prototype.start = function start( app) {
  this.app = app;
  app.registerHTTPDelegate(this.path, this);
};


HttpService.prototype.handle = function handle(req, res, next) {
  let method = req.method;
  if(method === this.method){
    console.log("HTTP got called, firing event");
    for (let index = 0; index < this.eventNames.length; index++) {
      this.app.handleEvent(this.eventNames[index], {"req":req, "res":res} )
    }
  }else{
    next();
  }
}

HttpService.prototype.stop = function stop(handlers) {
  this.app.unregisterHTTPDelegate(this.path, this);
};

module.exports = {
  HttpService: HttpService,
}