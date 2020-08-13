
function CronService(interval) {
    this.interval = interval;
    this.cancalable;
    this.eventNames = [];
    this.app;
}

CronService.prototype.addEventName = function addEventName(eventName) {
    this.eventNames.push(eventName);
}

CronService.prototype.on = function on(options) {
    this.interval = options.interval;
    return this;
}

CronService.prototype.start = function start(app) {
    this.app  = app;
    const timeoutObj = setInterval((app) => {
        for (let index1 = 0; index1 < this.eventNames.length; index1++) {
            const eventName = this.eventNames[index1];
            this.app.handleEvent(eventName);
        }
    }, this.interval);
    this.cancalable = timeoutObj;
};

CronService.prototype.stop = function stop(handlers) {
    clearInterval(cancalable);
};


module.exports = {
    CronService: CronService,
}
