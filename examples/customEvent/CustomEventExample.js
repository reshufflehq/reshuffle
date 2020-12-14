const { CustomEventConnector, Reshuffle } = require('../..')

const app = new Reshuffle()
const connector = new CustomEventConnector(app)

connector.on({ channel: 'One', payload: { name: 'Jack', age: 25 } }, (event) => {
  console.log('Custom Event One: ', event.options)
})

connector.on({ channel: 'Two', payload: 'Just a String' }, (event) => {
  console.log('Custom Event Two: ', event.options)
})
async function main() {
  connector.fire('One')
  connector.fire('Two')
}

app.start()

main()
