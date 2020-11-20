const { Reshuffle } = require('reshuffle')
const { AsanaConnector } = require('reshuffle-asana-connector')

// Your project id can be found in Asana project home page URL (e.g https://app.asana.com/0/<YOUR_PROJECT_ID>/board)
const projectId = '<OUR_PROJECT_ID>'

const app = new Reshuffle()

// This example uses reshuffle-asana-connector
// Code and full documentation available on Github: https://github.com/reshufflehq/reshuffle-asana-connector

// Get an Asana access token:
// - Go to https://app.asana.com/0/developer-console
// - Under 'Personal Access Token'' > '+ New Access Token'
// - Name it, then copy your token
const connector = new AsanaConnector(app, {
  accessToken: process.env.ASANA_ACCESS_TOKEN,
  baseURL: process.env.RUNTIME_BASE_URL,
  workspaceId: process.env.ASANA_WORKSPACE_ID,
})

// Listening to added entities in your project
connector.on({ gid: projectId, asanaEvent: 'added' }, async (event, app) => {
  const newTask = await connector.sdk().tasks.findById(event.resource.gid)
  console.log('new task details', newTask)
})

async function main() {
  const me = await connector.sdk().users.me()
  console.log(me) // { name: 'my name', email: 'email@foo.com', ... }

  const project = await connector.sdk().projects.findById(projectId)
  console.log('project details', project) // { name: 'my project name', ... }

  const team = await connector.sdk().teams.findById(project.team.gid)
  console.log('team details', team) // { name: 'Engineering', gid: '112233', organization: { name: 'my organisation name', gid: '12345'} ... }

  const tasks = await connector.sdk().tasks.findByProject(projectId)
  console.log(`tasks for project ${projectId}`, tasks.data) // [{ gid: '1199204075353966', name: 'File uploader broken on Chrome' }, ...]

  const taskUpdated = await connector
    .sdk()
    .tasks.update(tasks.data[0].gid, { name: 'New name from Reshuffle' })
  console.log(taskUpdated)

  const task = await connector
    .sdk()
    .tasks.createInWorkspace(project.workspace.gid, { name: 'my new task' })
  console.log(`new task created`, task) // { gid: '1234567898765', name: 'my new task' }
}

app.start()

main()
