# reshuffle

[Code](https://github.com/reshufflehq/reshuffle) |
[npm](https://www.npmjs.com/package/reshuffle) |
[Code sample](https://github.com/reshufflehq/reshuffle/examples/customEvent)


### Reshuffle Custom Event Connector

This package contains a [Reshuffle](https://github.com/reshufflehq/reshuffle)
connector that can fire a customized event. Developer can fire it from a script.

The following example exposes an endpoint to return the data of a Custom event after it was fired.

```js
const { CustomEventConnector, Reshuffle } = require('reshuffle')

const app = new Reshuffle()

const connector = new CustomEventConnector(app)

connector.on(
    { channel:'channel-one' },
    (event) => {
      console.log('Custom Event One: ', event.payload)
    }
  )
  
  connector.on(
    { channel:'channel-two' },
    (event) => {
      console.log('Custom Event Two: ', event.payload)
    },
  )

app.start()
```

### Table of Contents

#### Connector Events

[Fire Custom Events](#listen)

### <a name="events"></a> Events

#### <a name="listen"></a> Fire Custom Events

Fire Custom events is executed inside the developer's script, you'll need to capture them with the connector's `on` function, providing a `CustomEventConnectorEventOptions` to it.


```typescript
interface CustomEventConnectorEventOptions {
  channel: string
}
```

_Example:_

```typescript
connector.on(
  { channel:'channel-one' },
  (event) => {
    console.log('Custom Event One: ', event.payload)
  },
)

connector.on(
  { channel:'channel-two' },
  (event) => {
    console.log('Custom Event Two: ', event.payload)
  },
)
```
- `channel` will be used to identify and fire the event.

_Example:_

```typescript
  connector.fire('channel-one', { name: 'Jack', age: 25 })
  connector.fire('channel-two', 'A String to display')
```

