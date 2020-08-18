const { EventConfiguration } = require("./eventConfiguration");
const { nanoid } = require('nanoid');

class CronService {
    constructor(options, id) {
        if (!id) {
            id = nanoid();
        }
        this.options = options;
        this.id = id;
        this.app;
        this.eventConfigurations = {};
        this.cancalables = {}
        this.started = false;
    }

    update(options){this.options = options;/* todo, implement update */}

    on(options, event_id) {
        if (!event_id) {
            event_id = `CRON/${options.interval}/${this.id}`
        }

        let event = new EventConfiguration(event_id, this, options);
        this.eventConfigurations[event.id] = event;
        // lazy run if already running
        if(this.started){
            const timeoutObj = setInterval(() => {  
                this.app.handleEvent(event.id);
            }, event.options.interval);
            this.cancalables[event.id] = timeoutObj;
        }
        return event;
    }

    removeEvent(event){
        delete this.eventConfigurations[event.id];
        clearInterval(this.cancalables[event.id]);
    }

    start(app) {
        this.app = app;
        if(!this.started){
            for (const index in this.eventConfigurations) {
                let eventConfiguration = this.eventConfigurations[index];
                const timeoutObj = setInterval(() => {  
                    this.app.handleEvent(eventConfiguration.id);
                }, eventConfiguration.options.interval);
                this.cancalables[eventConfiguration.id] = timeoutObj;
            }  
        }
        this.started = true;  
    }
    
    stop() {
        for (const index in this.cancalables) {
            let cancalable = this.cancalables[index]
            clearInterval(cancalable);
        } 
    }

}






module.exports = {
    CronService: CronService,
}
