function SlackService() {
    this.serviceNames = [];
    this.app;
}

SlackService.prototype.addServiceName = function addServiceName(serviceName, app) {
    this.serviceNames.push(serviceName);
    this.app = app;
}

SlackService.prototype.send = function send(message) {
    console.log(message);
}


module.exports = {
    SlackService: SlackService,
}
