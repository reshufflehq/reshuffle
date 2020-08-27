const {Reshuffle, CronService, SQLStoreStategy} = require('../..');
const { Pool } = require('pg')
const app = new Reshuffle();

const service = new CronService();
app.register(service);

// see https://node-postgres.com/features/connecting on how to configure the pool
const pool = new Pool();
const persistentStore = new SQLStoreStategy(pool, "reshuffledb");
app.setPersistentStore(persistentStore);

app.when(service.on({'interval':5000}), async (event) =>  {
  let store = event.getPersistentStore();
  let times = await store.get('scripts/times-said-hello') || 0;
  console.log(`Hello World! ${times} times.`);
  times++;
  await store.set("scripts/times-said-hello", times);
});

app.start()
