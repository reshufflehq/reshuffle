# Building Reshuffle Connectors
Reshuffle comes with several connectors that connect to common systems. 
It is also extendable and lets you create your own connector.
 You will want to create a connector when you need to integrate with a homegrown system,
  or a service that does not have a connector yet.

The easiest way to create a new connector is you use the template in our
reshuffle-example-connector repo (coming soon!). You can also install and
extend the reshuffle-base-connector repo without using our example. Lastly,
if you like to do things all by yourself, you just need to create a class
and implement the following methods.
### The Connector class
```js
class MyConnector{
    
constructor(app, connectorOptions, id) {...}

start(app) {...}

stop() {...}

update(connectorOptions) {...}

on(eventOptions, handler, eventId) {...}
}
```

#### The `constructor(app, options, id)`
This method returns a new instance of this class.  
**Params:**
* **app** - a Reshuffle object that serves as the runtime.  
* **options** - these are parameters that lets your connector know how to connect to the 3rd party service. You can pass the URL for that service for example.
* **id** - the identifier of this connector instance, after this connector is registered to a Reshuffle app, it can be accessed using this id from anywhere.

#### The `start(app)` method
This method is called by the reshuffle app object when the app itself starts. 
When this method returns, this connector should be connected to the 3rd party service and ready to emit the relevant events and enable the specific actions.     

**Params:**
* **app** - this is the Reshuffle app object, you can use this object to access app methods (see, _Reshuffle `app` methods, your controller can use_). Most importantly, your connector can use this `app` object to fire events using the `app.handleEvent(...)` method. 

#### The `stop()` method
This method is called by the app when the service should stop. When this method returns, the service should disconnect from the service.

#### The `update(options)` method
This method is called when a connector information to a service changes. For example an update the a user password when connecting to an email server.  

**Params:**
* **options** - these are parameters that lets your connector know how to connect to the 3rd party service. You can pass the URL for that service for example.

#### The `on(options, handler, eventid)` method
The on method configures events that this connector should emmit. Developers will use this method to define which events should a connector emit, after the `start(app)` method is called.
At the minimum, this method should create an EventConfiguration object, store it locally for future use, and return it at the end of this method call. 
At the appropriate time after `start()` is called, the connector should emit events using the `app.handleEvent(eventName, event)` method (see, _Reshuffle `app` methods, your controller can use_).

**Params:**
* **options** - these are parameters that lets your connector know how to connect to the 3rd party service. You can pass the URL for that service for example.
* **handler** - this is the event listener function for this event configuration. You should pass this funtion to the `app` object using the `when(eventConfiguration, handler)` method.
* **eventid** - controllers should use this eventId when emitting this event using the `app.handleEvent(eventId, event)` method. 
Reshuffle uses this id to trigger the logic that is listening to this event.  (see, _Reshuffle `app` methods, your controller can use_)

**Returns:**
* **EventConfiguration object** event configuration is a object that encapsulates all the information needed by the Connector to emit the relevant event. 
see EventConfiguration.js in this package for more information. 

### Reshuffle `app` methods your controller can use. 
The Reshuffle object, passed as an `app` in the `start(app)` method is very useful for developing a connector, because it provides several methods that the connector can use.

#### The `app.handleEvent(eventId, event)`
Connectors use this method to emit events when a preconfigured event happens in the 3rd service. 
**Params:**
* **eventId** - this is an identifier of the event. Reshuffle uses that event name to trigger the right business logic. 
This event id is passed to the controller in the `on(options, eventid)` method, when the developer is configuring the event.
* **event** - this is a container that the controller can use to pass any information to the logic that is triggered as a result of this event.

##### _This is slightly complex so lets see an example:_

Lets say you are building an server monitor connector - your connector might emit the following events types:
* **server-down**  - emits when a monitored server is down.
* **server-up**  - emits when a monitored server that was down is back up.

here is how a developer will configure such an event to their logic:
```js
const {Reshuffle} = require('reshuffle');
const {MonitorConnector} = require('my-package');

const app = new Reshuffle();

const monitor = new MonitorConnector(app, {ip:"194.24.23.56"});

monitor.on({type:"server-down"}, (event) => {
    console.log("server is down- "+event.server_ip)
},"server-crashed");

app.start();
```

When the `monitor.on({type:"server-down"},"server-crashed")` is called, the monitor controller register the EventConfiguration, stores the fact that it needs to monitor the server for that type of event, and returns the EventConfiguration object:
````js
on(options, handler, eventId) {
    if (!eventId) {
      eventId = `monitor/${options.ip}/${this.id}`
    }
    
    const event = new EventConfiguration(eventId, this, options)
    this.serverDownEventConfigurations[event.id] = event;
    // add the handler with the Reshuffle engine
    this.app.when(event,handler)
    return event
}
````
Next, when `app.start()` is called, the Reshuffle app object calls the monitor `start(app)` method, the monitor start monitoring the server.
When the server is down the monitor connector will call the `app.handleEvent(eventId, event)`:

````js
if(serverIsDown){
    // go over all the event configuration for server down and trigger the event
    serverDownEventConfigurations.forEach((serverDownEventConfiguration) =>{
        this.app.handleEvent(serverDownEventConfiguration.id, {"server_ip":this.options.ip})
    });
}
````
Reshuffle will then route the event, based on the eventId to the right logic that will print out `server is down- 194.24.23.56`, and the magic happens.

#### The `app.registerHTTPDelegate(path, delegate)`
Many connectors need to listen for HTTP calls. For example, a Slack connector needs to listen to incoming HTTP events emitted by the Slack events API.
Reshuffle helps you register to these calls and removes the need from the Connector to run it's own HTTP server. 
At any time your controller call this method to regiter a delegate (most commonly itself) as a handler to that path.
```js
app.registerHTTPDelegate("/foo/bar", this);
``` 
The delegate object (in this case the controller itself) must implement a `async handle(req, res, next)` method that will be called by Reshuffle when this HTTP path is hit.

#### The `app.getPersistentStore()` method
Storing persistent information is a common need for many connectors. 
Reshuffle abstracts the implementation of how the data is stored, provides several implementations the developer can choose from, and provides a standard interface for the connector.

More information on how to use the persistent store [can be found here](./persistency.md). 

If you have any questions, please feel free to contact us at dev@reshuffle.com - please remember to review the example connector provided in this [repo](todo).

Happy coding!