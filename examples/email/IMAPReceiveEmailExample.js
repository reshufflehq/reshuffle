const { Reshuffle } = require('../..')
const { IMAPConnector } = require ('reshuffle-imap-connector')

// Can easily be tested using https://ethereal.email/

const app = new Reshuffle()
const imap = new IMAPConnector(app,
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

imap.on({name:'email'},'email',(event) => {
    console.log(event.mail.body.text)
})

app.start()
