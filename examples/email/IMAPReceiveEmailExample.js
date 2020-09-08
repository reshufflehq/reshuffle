const { Reshuffle } = require('../..')
const { IMAPConnector } = require ('reshuffle-imap-connector')

const app = new Reshuffle()
const imap = new IMAPConnector(
  {
    host: '<imap host>',
    port: 993,
    user: '<inbox email address>',
    password: '<inbox password>',
    tls: true,
   // tlsOptions: Record<string, any>
    markSeen: false,
  },
  'connectors/IMAP'
)
app.register(imap)

app.when(imap.on({name:'email'},'email'),(event) => {
    console.log(event.mail.body.text)
})

app.start()
