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
        return this.id;
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
