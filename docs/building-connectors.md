# Building Reshuffle Connectors
The Reshuffle connectors ecosystem comprises several connectors to common systems. 
It is also extendable and lets you create your own connector.

Building your own connector may be required in some cases. For example - when you need to integrate with a homegrown system, 
or in cases when you may be using a web based service that does not have a connector yet.


The easiest way to create a new connector is you use the template in our
reshuffle-example-connector repo (coming soon!). You can also install and
extend the reshuffle-base-connector repo without using our example. 

When using either of these methods, your connector class will need to implement the following methods:
### Extending the BaseConnector class
```js
class MyConnector extends BaseConnector<MyConnectorOptions> {
    
  constructor(options, id) {...}

  onStart(app) {...}

  onStop() {...}

  onRemoveEvent(event) {...}

  updateOptions(options) {...}

  on(eventOptions, eventId) {...}

}
```
#### `constructor(options, id)`
Create a new instance of the connector.
  
**Params:**
* **options** - The details the connector needs in order to connect to the target service. If, for example, the service requires an authentication token or a service URL, this is the mechanism you will use to provide it.
* **id** - the identifier of this connector instance, after this connector is registered to a Reshuffle app, it can be looked up using this id from anywhere.

#### `onStart(app)`
When the Reshuffle's app `start` method executes, it calls `start` on each of the connectors registered to it.

Connectors extending Reshuffle's `BaseConnector` can implement the `onStart` method. It functions as a hook for cases where the connector requires some special setup or initialization code to run upon start.
The contract for this method stipulates that when it returns, the connector should be connected to service it exposes - ready to emit the relevant events and enable the specific actions.     

**Params:**
* **app** - The Reshuffle app object. The connector code can use this object to access `app`'s methods (see, _Reshuffle `app` methods your connector can use_). Most importantly, your connector can use this `app` object to fire events using the `app.handleEvent(...)` method. 

#### `onStop()` 
When the Reshuffle app unregisters a connector, it calls the connector's `stop()` method.
Connectors extending Reshuffle's `BaseConnector` can implement the `onStop` method. It functions as a hook for cases where the connector requires some special teardown code.
When this method returns, the connector should disconnect from the service it exposes.

#### `updateOptions(options)`
This method is called by the Reshuffle app when a change is made to the connector's parameters. For example, an update to the user password when connecting to an email server.  

**Params:**
* **options** - (See above too) - The details the connector needs in order to connect to the target service. If, for example, the service requires an authentication token or a service URL, this is the mechanism you will use to provide it.

#### `on(options, eventId)`
The on method configures events for this connector to emit. Developers can use this method to define which events the connector emit.
 
The connector should only emit events after the `start(app)` method is called.

At a minimum, this method should create an EventConfiguration object, store it locally for future use, and return it at the end of this method call. 
At the appropriate time after `start(app)` is called, the connector should emit events using the `app.handleEvent(eventName, event)` method (see, _Reshuffle `app` methods, your connector can use_).

**Params:**
* **options** - (See above too) - The details the connector needs in order to connect to the target service. If, for example, the service requires an authentication token or a service URL, this is the mechanism you will use to provide it.
* **eventId** - connectors must use this eventId when emitting this event using the `app.handleEvent(eventId, event)` method. 
Reshuffle uses this id to trigger the logic (handlers) subscribed to this event.  (see, _Reshuffle `app` methods, your connector can use_)

**Returns:**
* **EventConfiguration object** Event Configuration is a object that encapsulates all the information needed by the Connector to emit the relevant event. 
see `EventConfiguration.js` in this package for more information. 

## Creating your own connector from scratch
If you choose to develop your own connector without using a Reshuffle template or the `BaseConnector` class, 
you just need to create a class that provides implementation of the following interface:
### The Connector class
```js
class MyConnector {
    
  constructor(options, id) {...}

  start(app) {...}

  stop() {...}

  onRemoveEvent(event) {...}

  updateOptions(options) {...}

  on(eventOptions, eventId) {...}

}
```
The difference between this and extending `BaseConnector` is that here you need to provide implementations for
the `start(app)` and `stop()` methods directly, as the Reshuffle app expects to find them on a connector.

#### `start(app)`
When the Reshuffle's app `start` method executes, it calls `start` on each of the connectors registered to it.

The contract for this method stipulates that when it returns, the connector should be connected to service it exposes - ready to emit the relevant events and enable the specific actions.     

**Params:**
* **app** - The Reshuffle app object. The connector code can use this object to access `app`'s methods (see, _Reshuffle `app` methods your connector can use_). Most importantly, your connector can use this `app` object to fire events using the `app.handleEvent(...)` method. 

#### `stop()` 
This method is called by the Reshuffle app when the connector should stop. When this method returns, the connector should disconnect from the service it exposes.

The definitions of the rest of the method above - `constructor`, `onRemoveEvent`, `updateOptions` and `on` - are identical to the case where your connector extends `BaseConnector`.


### Reshuffle `app` methods your connector can use. 
When Reshuffle starts (using `Reshuffle.start()`) - the framework calls `start(app)` on each of the connectors registered with it.
The `app` the connector receives is the Reshuffle object itself. This is useful for connector development, as it exposes several methods that the connector can use.

#### The `app.handleEvent(eventId, event)`
Connectors use this method to emit events when a required. For example - when a message comes through an external service. 

**Params:**
* **eventId** - An event identifier. Reshuffle uses the event id to execute the right business logic. 
This event id is specified in the `on(options, eventId)` method, used to register and configure the event.
* **event** - A container that the connector can use to pass any information to the logic that is executed as a result of this event.

##### _This is slightly complex so let's see an example:_

Let's say you are building a server monitor connector - the `ServerMonitorConnector`. Your connector might emit the following events:
* **server-down**  - emitted when a monitored server is down.
* **server-up**  - emitted when a monitored server that was down is back up.

A developer may configure the following:
```js
const { Reshuffle } = require('reshuffle');
const { ServerMonitorConnector } = require('server-monitor-connector');

const app = new Reshuffle();
const monitor = new ServerMonitorConnector({
  ip:'194.24.23.56'
});

app.register(monitor);

// Configure a handler that subscribes to the ServerMonitor's `server-down` event with the id `server-crashed` 
app.when(monitor.on({type:'server-down'},'server-crashed'), (event) => {
    console.log(`Server is down - ${event.server_ip}`)
});
app.start();
```

When your code calls `monitor.on({type:"server-down"},"server-crashed")`, the connector registers the EventConfiguration provided. Reshuffle then registers the handler subscribing to this specific event.
````js
on(options, eventId) {
  if (!eventId) {
    eventId = `monitor/${this.id}/${options.ip}`
  }

  const event = new EventConfiguration(eventId, this, options)

  this.eventHandlers[event.id].push(event);
  return event
}
````
Next, when `app.start()` is called, the Reshuffle app object calls `start(app)` on the connector. The monitor's logic then starts monitoring the server.
When the server is down the monitor connector will call the `app.handleEvent(eventId, event)`:

````js
if(serverIsDown){
    // Trigger all events registered for the server down notification
    serverDownEventConfigurations.forEach((serverDownEventConfiguration) =>{
        this.app.handleEvent(serverDownEventConfiguration.id, {"server_ip":this.options.ip})
    });
}
````
Reshuffle will then route the event, based on the eventId to the right logic that will print out `server is down- 194.24.23.56`, and the magic happens.

#### The `app.registerHTTPDelegate(path, delegate)`
Many connectors need to listen for HTTP calls. For example, a Slack connector needs to listen to incoming HTTP events emitted by the Slack events API.
Reshuffle helps you register to these calls and removes the need from the Connector to run its own HTTP server. 
At any time your connector call this method to register a delegate (most commonly itself) as a handler to that path.
```js
app.registerHTTPDelegate("/foo/bar", this);
``` 
The delegate object (in this case the connector itself) must implement an `async handle(req, res, next)` method that will be called by Reshuffle when this HTTP path is hit.

#### The `app.getPersistentStore()` method
Storing persistent information is a common need for many connectors. 
Reshuffle abstracts the implementation of how the data is stored, provides several implementations the developer can choose from, and provides a standard interface for the connector.

More information on how to use the persistent store [can be found here](./persistency.md). 

If you have any questions, please feel free to contact us at dev@reshuffle.com - please remember to review the example connector provided in this [repo](todo).

Happy coding!