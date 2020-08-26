const { EventConfiguration } = require('./eventConfiguration');
const { nanoid } = require('nanoid');

class SlackService {
    constructor(options, id) {
        if (!id) {
            id = nanoid();
        }
        this.options = options;
        this.id = id;
        this.eventConfigurations = {};
        this.started = false;
    }

    update(options){this.options = options;/* todo, implement update */}

    on(options, event_id) {
        return new EventConfiguration(event_id, this, {});
    }
    send(message) {
        console.log(message);
    }
    start(app) {
        this.app = app;
        this.started = true;
    }
    removeEvent(event){
        delete this.eventConfigurations[event.id]  
    }
    stop() {
    }
}


module.exports = {
    SlackService,
}