const { HttpConnector, Reshuffle } = require('reshuffle')
const { AirtableConnector } = require('reshuffle-airtable-connector')

const app = new Reshuffle()

const airtableConnector = new AirtableConnector(app, {
    endpointUrl: 'https://api.airtable.com',
    apiKey: 'YOUR_API_KEY',
    base: 'YOUR_BASE'
})

airtableConnector.on({ type: 'RecordModified', table: 'Design projects' }, async (event, app) => {
    console.log('==> RecordModified - Design projects')
    console.log('==> event id', event.id)
    console.log('==> event fields', event.fields)
})

airtableConnector.on({ type: 'RecordModified', table: 'Tasks' }, async (event, app) => {
    console.log('==> RecordModified - Tasks')
    console.log('==> event id', event.id)
    console.log('==> event fields', event.fields)
})

airtableConnector.on({ type: 'RecordAdded', table: 'Design projects' }, async (event, app) => {
    console.log('==> RecordAdded - Design projects')
    console.log('==> event id', event.id)
    console.log('==> event fields', event.fields)
})

airtableConnector.on({ type: 'RecordAdded', table: 'Tasks' }, async (event, app) => {
    console.log('==> RecordAdded - Tasks')
    console.log('==> event id', event.id)
    console.log('==> event fields', event.fields)
})

airtableConnector.on({ type: 'RecordDeleted', table: 'Design projects' }, async (event, app) => {
    console.log('==> RecordDeleted - Design projects')
    console.log('==> event id', event.id)
    console.log('==> event fields', event.fields)
})

airtableConnector.on({ type: 'RecordDeleted', table: 'Tasks' }, async (event, app) => {
    console.log('==> RecordDeleted - Tasks')
    console.log('==> event id', event.id)
    console.log('==> event fields', event.fields)
})

app.start()
