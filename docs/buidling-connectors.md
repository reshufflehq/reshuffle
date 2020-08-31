# Building your own Reshuffle Connector 
Reshuffle comes with several connectors that connects to common systems. 
it is also extendable and lets you create your own connector. 
You will want to create a connector when you need to integrate with a homegrown system, or a service that does not have a connector yet.

The easiest way to create a new connector is you use the template in our `reshuffle-example-connector` repo.
You can also install and extend the `reshuffle-base-connector` repo without using our example. 
Lastly, if you like to do things all by yourself, you just need to create a class and implement the following methods. 

### The Connector class
```js
class MyConnector{
    
constructor(options, id) {...}

start(app) {...}

stop() {...}

update(options) {...}

on(options, eventId) {...}
}
```

##### The `constructor(...)`
This method returns a new instance of this class.  
**Params:**
* **options** - these are parameters that lets your connector know how to connect to the 3rd party service. You can pass the URL for that service for example.
* **id** - the identifier of this connector instance, after this connector is registered to a Reshuffle app, it can be accessed using this id from anywhere.

##### The `start()` method
This method is called by the reshuffle app object when the app itself starts. 
When this method returns, this connector should be connected to the 3rd party service and ready to emit the relevant events and enable the specific actions.     
**Params:**
* **app** - this is the Reshuffle app object, you can use this object to access app methods (see, _Reshuffle `app` methods, your controller can use_). Most importantly, your connector can use this `app` object to fire events using the `app.handleEvent(...)` method. 

##### The `stop()` method
This method is called by the app when the service should stop. When this method returns, the service should disconnect from the service.


#### Reshuffle `app` methods your controller can use. 

##### The `app.handleEvent(eventName, event)`

