const { EventConfiguration } = require("./eventConfiguration");
const { nanoid } = require('nanoid');

class SlackService {
    constructor(options, id) {
        if (!id) {
            id = nanoid();
        }
        this.options = options;
        this.id = id;
        this.app;
        this.eventConfigurations = {};
    }
    on(options, event_id) {
        let event = new EventConfiguration(event_id, this, {});
        return event;
    }
    send(message) {
        console.log(message);
    }
    start(app) {
    }
}





module.exports = {
    SlackService: SlackService,
}
