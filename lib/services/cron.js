"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const eventConfiguration_1 = __importDefault(require("../eventConfiguration"));
const nanoid_1 = require("nanoid");
class CronService {
    constructor(options, id) {
        if (!id) {
            id = nanoid_1.nanoid();
        }
        this.options = options;
        this.id = id;
        this.eventConfigurations = {};
        this.cancelables = {};
        this.started = false;
    }
    update(options) { this.options = options; /* todo, implement update */ }
    on(options, eventId) {
        if (!eventId) {
            eventId = `CRON/${options.interval}/${this.id}`;
        }
        const event = new eventConfiguration_1.default(eventId, this, options);
        this.eventConfigurations[event.id] = event;
        // lazy run if already running
        if (this.started) {
            const intervalId = setInterval(() => {
                this.app.handleEvent(event.id);
            }, event.options.interval);
            this.cancelables[event.id] = intervalId;
        }
        return event;
    }
    removeEvent(event) {
        delete this.eventConfigurations[event.id];
        clearInterval(this.cancelables[event.id]);
    }
    start(app) {
        this.app = app;
        if (!this.started) {
            Object.values(this.eventConfigurations).forEach(eventConfiguration => {
                const intervalId = setInterval(() => {
                    this.app.handleEvent(eventConfiguration.id);
                }, eventConfiguration.options.interval);
                this.cancelables[eventConfiguration.id] = intervalId;
            });
        }
        this.started = true;
    }
    stop() {
        for (const index in this.cancelables) {
            const cancelable = this.cancelables[index];
            clearInterval(cancelable);
        }
    }
}
exports.default = CronService;
