Create a Cron task

_Triggers_:

[task](#task) Create a Cron task

### Event Details

#### <a name="task"></a>

Cron Event

_Event parameters:_

```
expression: string - the cron expression for a task
```

_Handler inputs:_

```
none, general event provided
```

_Example:_

```js
async (event) => {
  console.log('Task executed')
}
```

Execute a single task based on the cron expression
