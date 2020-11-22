const { Reshuffle } = require('reshuffle')
const { GitHubConnector } = require('reshuffle-github-connector')

const app = new Reshuffle()
const connector = new GitHubConnector(app, {
  token: process.env.TOKEN,
  runtimeBaseUrl: process.env.RUNTIME_BASE_URL,
})

connector.on(
  {
    owner: 'reshufflehq',
    repo: 'reshuffle',
  },
  (event) => {
    console.log('GitHub Event: ', event)
  },
)

async function main() {
  const repoIssues = await connector.sdk().issues.get({
    owner: 'reshufflehq',
    repo: 'reshuffle',
    issue_number: 10,
  })
  console.log(JSON.stringify(repoIssues.data))
}

app.start()
main()
