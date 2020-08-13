const {Reshuffle, CronService} = require('reshuffle')
const app = new Reshuffle();

app.addEvent('Cron/sec/5', new CronService().on({'interval':5000}))

app.when('Cron/sec/5', (event) => {
  console.log('Hello World!')
})

app.start(() => {
  console.log(`Example workflow`)
})

