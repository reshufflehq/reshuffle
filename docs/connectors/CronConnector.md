## Cron Connector

Add tasks to excute in set intervals.

_Triggers_:

[interval](#interval) Create a task to execute at a specified interval

### Event Details

#### <a name="interval"></a>Interval Event

_Event parameters:_

```
interval: number - number of seconds between subsequent task executions
```

_Handler inputs:_

```
none, general event provided
```

_Example:_

```js
async (event) => {
  console.log('Task executed');
}
```

Execute a single task every ```interval``` seconds
