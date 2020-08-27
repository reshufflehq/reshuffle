"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const nanoid_1 = require("nanoid");
const availableServices = __importStar(require("./services"));
class Reshuffle {
    constructor() {
        this.availableServices = availableServices;
        this.port = parseInt(process.env.PORT, 10) || 8000;
        this.httpDelegates = {};
        this.registry = { services: {}, handlers: {}, common: {} };
        console.log('Initializing Reshuffle');
    }
    createWebServer() {
        this.registry.common.webserver = express_1.default();
        this.registry.common.webserver.route('*')
            .all((req, res, next) => {
            let handled = false;
            if (this.httpDelegates[req.url]) {
                handled = this.httpDelegates[req.url].handle(req, res, next);
            }
            if (!handled) {
                res.end(`No handler registered for ${req.url}`);
            }
        });
    }
    register(service) {
        service.app = this;
        this.registry.services[service.id] = service;
    }
    unregister(service) {
        return __awaiter(this, void 0, void 0, function* () {
            yield service.stop();
            delete this.registry.services[service.id];
        });
    }
    getService(serviceId) {
        return this.registry.services[serviceId];
    }
    registerHTTPDelegate(path, delegate) {
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
                'id': nanoid_1.nanoid()
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
    start(port, callback = () => { console.log('Reshuffle started!'); }) {
        this.port = port || this.port;
        // Start all services
        Object.values(this.registry.services).forEach(service => service.start(this));
        // Start the webserver if we have http delegates
        if (Object.keys(this.httpDelegates).length > 0 && !this.registry.common.webserver) {
            this.createWebServer();
            this.registry.common.webserver.listen(this.port, () => {
                console.log(`Web server listening on port ${this.port}`);
            });
        }
        callback && callback();
    }
    restart(port) {
        this.start(port, () => { console.log('Refreshing Reshuffle configuration'); });
    }
    handleEvent(eventName, event) {
        if (event == null) {
            event = {};
        }
        const eventHandlers = this.registry.handlers[eventName];
        if (eventHandlers.length === 0) {
            return false;
        }
        event.getService = this.getService.bind(this);
        eventHandlers.forEach(handler => {
            this._p_handle(handler, event);
        });
        return true;
    }
    _p_handle(handler, event) {
        handler.handle(event);
    }
}
exports.default = Reshuffle;
