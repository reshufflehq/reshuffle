const { EventConfiguration } = require("./eventConfiguration");
const { nanoid } = require('nanoid');

class CronService {
    constructor(options, id) {
        if (!id) {
            id = nanoid();
        }
        this.options = options;
        this.id = id;
        this.eventConfigurations = {};
        this.cancelables = {}
        this.started = false;
    }

    update(options){this.options = options;/* todo, implement update */}

    on(options, event_id) {
        if (!event_id) {
            event_id = `CRON/${options.interval}/${this.id}`
        }

        const event = new EventConfiguration(event_id, this, options);
        this.eventConfigurations[event.id] = event;
        // lazy run if already running
        if(this.started){
            const timeoutObj = setInterval(() => {  
                this.app.handleEvent(event.id);
            }, event.options.interval);
            this.cancelables[event.id] = timeoutObj;
        }
        return event;
    }

    removeEvent(event){
        delete this.eventConfigurations[event.id];
        clearInterval(this.cancelables[event.id]);
    }

    start(app) {
        this.app = app;
        if(!this.started){
            for (const index in this.eventConfigurations) {
                const eventConfiguration = this.eventConfigurations[index];
                const timeoutObj = setInterval(() => {  
                    this.app.handleEvent(eventConfiguration.id);
                }, eventConfiguration.options.interval);
                this.cancelables[eventConfiguration.id] = timeoutObj;
            }  
        }
        this.started = true;  
    }
    
    stop() {
        for (const index in this.cancelables) {
            const cancelable = this.cancelables[index]
            clearInterval(cancelable);
        } 
    }

}

module.exports = {
    CronService,
}
