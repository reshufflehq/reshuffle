const { Reshuffle } = require('reshuffle')
const { GitHubConnector } = require('reshuffle-github-connector')

const app = new Reshuffle()

const connector = new GitHubConnector(app, {
  // See https://github.com/reshufflehq/reshuffle-github-connector/blob/master/README.md for instructions to obtain a token
  token: process.env.TOKEN,
  // Base URL of your reshuffle app
  runtimeBaseUrl: process.env.RUNTIME_BASE_URL,
})

// Listen to push events for the reshuffle repository
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
  // Get the issues for the reshufflehq/reshuffle repo
  const repoIssues = await connector.sdk().issues.get({
    owner: 'reshufflehq',
    repo: 'reshuffle',
    issue_number: 10,
  })
  console.log(JSON.stringify(repoIssues.data))
}

// Start the reshuffle app
app.start()

main()
