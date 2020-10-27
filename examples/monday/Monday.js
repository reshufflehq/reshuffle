const { Reshuffle } = require('reshuffle')
const { MondayConnector } = require('reshuffle-monday-connector')

const BOARD_ID = 8948594
const MY_TOKEN = 'MY_TOKEN'
const BASE_URL = 'https://example.com'
const PATH = '/monday-endpoint'
const EVENT_TYPE = 'change_column_value'

const app = new Reshuffle()
const connector = new MondayConnector(app, {
  token: MY_TOKEN,
})

connector.on(
  {
    path: PATH,
    baseUrl: BASE_URL,
    eventType: EVENT_TYPE,
    boardId: BOARD_ID,
  },
  ({ req }) => {
    console.log('Column value changed: ', JSON.stringify(req.body))
  },
)

async function main() {
  try {
    const board = await connector.getBoard(BOARD_ID)
    const itemIds = board.boards[0].items.map((x) => Number(x.id))
    const items = await connector.getItem(itemIds)
    console.log('My items: ', items)
  } catch (error) {
    console.log(error)
  }
}

app.start()

main()
