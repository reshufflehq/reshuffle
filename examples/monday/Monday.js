const { Reshuffle } = require('reshuffle')
const { MondayConnector } = require('reshuffle-monday-connector')

const BOARD_ID = 8948594
const MY_TOKEN = ''

const app = new Reshuffle()
const connector = new MondayConnector(app, {
  token: MY_TOKEN,
})

const mc = connector.on(
  {
    path: '/test-monday-endpoint',
    baseUrl: 'https://example.com',
    eventType: 'change_column_value',
    boardId: BOARD_ID,
  },
  ({ req }) => {
    console.log(JSON.stringify(req.body))
  },
)

setInterval(() => connector.removeEvent(mc), 15000)

async function main() {
  try {
    const board = await connector.getBoard(BOARD_ID)
    const itemIds = board.boards[0].items.map((x) => Number(x.id))
    const items = await connector.getItem(itemIds)
    const groupId = board.boards[0].groups[0].id
    console.log(groupId)
    const group = await connector.getGroup(BOARD_ID, groupId)
    const newItem = await connector.createItem(BOARD_ID, 'my test new item')
    console.log(JSON.stringify(items))
    console.log(JSON.stringify(group))
    console.log(JSON.stringify(newItem))
  } catch (error) {
    console.log(error)
  }
}

app.start()

main()
