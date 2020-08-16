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
    }

    on(options, event_id) {
        if (!event_id) {
            event_id = `CRON/${options.interval}/${this.id}`
        }

        let event = new EventConfiguration(event_id, this, options);
        this.eventConfigurations[event.id] = event;

        return event.id;
    }
    start(app) {
        this.app = app;
        for (const index in this.eventConfigurations) {
            let eventConfiguration = this.eventConfigurations[index];
            const timeoutObj = setInterval((app) => {  
                this.app.handleEvent(eventConfiguration.id);
            }, eventConfiguration.options.interval);
            this.cancalables[eventConfiguration.id] = timeoutObj;
        }    
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
