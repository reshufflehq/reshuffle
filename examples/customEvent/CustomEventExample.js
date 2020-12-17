const { CustomEventConnector, Reshuffle } = require('../..')

const app = new Reshuffle()
const connector = new CustomEventConnector(app)

connector.on({ channel: 'One' }, (event) => {
  console.log('Custom Event One: ', event)
})

connector.on({ channel: 'Two' }, (event) => {
  console.log('Custom Event Two: ', event)
})
async function main() {
  connector.fire('One', { name: 'Jack', age: 25 })
  connector.fire('Two', 'Just a String')
}

app.start()

main()
