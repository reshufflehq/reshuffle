import express, { Express, Request, Response, NextFunction  } from "express"
import {nanoid} from "nanoid"
import * as availableServices from './services'
import EventConfiguration from "./eventConfiguration";

export interface Service {
    id: number
    app: Reshuffle
    start: () => void
    stop: () => void
}

export default class Reshuffle {
    availableServices: any
    httpDelegates: any
    port: number
    registry: { services: any, handlers: any, common: { webserver?: Express }}

    constructor() {
        this.availableServices = availableServices
        this.port = parseInt(<string>process.env.PORT, 10) || 8000
        this.httpDelegates = {}
        this.registry = { services: {}, handlers: {}, common: {}}

        console.log('Initializing Reshuffle');
    }

    createWebServer() {
        this.registry.common.webserver = express();
        this.registry.common.webserver.route('*')
            .all((req: Request, res: Response, next: NextFunction) => {
                let handled = false
                if (this.httpDelegates[req.url]) {
                    handled = this.httpDelegates[req.url].handle(req, res, next);
                }
                if (!handled) {
                    res.end(`No handler registered for ${req.url}`);
                }
            });
    }

    register(service : Service) {
        service.app = this;
        this.registry.services[service.id] = service;

        return service;
    }

    async unregister(service : Service) {
        await service.stop()
        delete this.registry.services[service.id];
    }

    getService(serviceId: Service['id']) {
        return this.registry.services[serviceId];
    }

    registerHTTPDelegate(path: string, delegate) {
        this.httpDelegates[path] = delegate;

        return delegate;
    }

    unregisterHTTPDelegate(path: string) {
        delete this.httpDelegates[path];
    }

    when(eventConfiguration: EventConfiguration, handler) {
        let handlerWrapper = handler;
        if (!handler.id) {
            handlerWrapper = {
                'handle': handler,
                'id': nanoid()
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

    start(port: number, callback = () => { console.log('Reshuffle started!')}) {
        this.port = port || this.port;

        // Start all services
        Object.values(this.registry.services).forEach(service => service.start(this))

        // Start the webserver if we have http delegates
        if(Object.keys(this.httpDelegates).length > 0 && !this.registry.common.webserver) {
            this.createWebServer();
            this.registry.common.webserver!.listen(this.port ,() => {
                console.log(`Web server listening on port ${this.port}`)
            });
        }

        callback && callback();
    }

    restart(port: number) {
        this.start(port, () => { console.log('Refreshing Reshuffle configuration')});
    }

    handleEvent(eventName: string, event) {
        if (event == null) {
            event = {};
        }

        const eventHandlers = this.registry.handlers[eventName];
        if(eventHandlers.length === 0){
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
