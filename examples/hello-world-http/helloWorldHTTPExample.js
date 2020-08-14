const {Reshuffle, HttpService} = require('../../index')
const app = new Reshuffle();

app.addEvent('HTTP/GET/test', 
  new HttpService().on({'method':'GET','path':'/test'}));

app.when('HTTP/GET/test', (event) => {
  event.res.end("Hello World!");
})

app.start(() => {
  console.log(`Example workflow`)
})