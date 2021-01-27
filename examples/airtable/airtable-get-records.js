const { HttpConnector, Reshuffle } = require('reshuffle')
const { AirtableConnector } = require('reshuffle-airtable-connector')

// After running this example go to http://localhost:8000/projects to view the results.

const app = new Reshuffle()

const airtableConnector = new AirtableConnector(app, {
    endpointUrl: 'https://api.airtable.com',
    apiKey: 'YOUR_API_KEY',
    base: 'YOUR_BASE'
})
    
const httpConnector = new HttpConnector(app)
const base = airtableConnector.base()

httpConnector.on({ method: 'GET', path: '/projects' }, async (event, app) => {
  base('Design projects').select({
    view: 'All projects'
  }).firstPage(function(err, records) {
    if (err) {
      event.res.json(err)
      return
    }
    const projects = []
    records.forEach(function(record) {
        projects.push(record.get('Name'))
    })
    event.res.json(projects)
  })
})

app.start()
