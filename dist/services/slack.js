"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const eventConfiguration_1 = __importDefault(require("../eventConfiguration"));
const nanoid_1 = require("nanoid");
class SlackService {
    constructor(options, id) {
        if (!id) {
            id = nanoid_1.nanoid();
        }
        this.options = options;
        this.id = id;
        this.eventConfigurations = {};
        this.started = false;
    }
    update(options) { this.options = options; /* todo, implement update */ }
    on(options, eventId) {
        return new eventConfiguration_1.default(eventId, this, {});
    }
    send(message) {
        console.log(message);
    }
    start(app) {
        this.app = app;
        this.started = true;
    }
    removeEvent(event) {
        delete this.eventConfigurations[event.id];
    }
    stop() {
    }
}
exports.default = SlackService;
