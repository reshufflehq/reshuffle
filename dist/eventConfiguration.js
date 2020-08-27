"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EventConfiguration {
    constructor(id, service, options) {
        this.id = id;
        this.service = service;
        this.options = options;
    }
    do(handler) {
        this.service.app.when(this, handler);
    }
}
exports.default = EventConfiguration;
