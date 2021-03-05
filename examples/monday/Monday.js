const { Reshuffle } = require('reshuffle')
const { MondayConnector } = require('reshuffle-monday-connector')

const BOARD_ID = 8948594
const MY_TOKEN = 'MY_TOKEN'
const BASE_URL = 'https://example.com'
const PATH = '/monday-endpoint'
const EVENT_TYPE = 'ChangeColumnValue'

const app = new Reshuffle()
const connector = new MondayConnector(app, {
  token: MY_TOKEN,
  baseURL: BASE_URL,
  webhookPath: PATH,
})

connector.on(
  {
    type: EVENT_TYPE,
    boardId: BOARD_ID,
  },
  (event) => {
    console.log('Changed column for item ', JSON.stringify(event.itemId))
  },
)

async function main() {
  try {
    const items = await monday.getBoardItems(BOARD_ID)
    console.log('My items: ', items)
  } catch (error) {
    console.log(error)
  }
}

app.start()

main()
