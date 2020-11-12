import request from 'supertest'
import { CronConnector, HttpConnector, Reshuffle } from '../src'
import { BaseConnector, EventConfiguration } from 'reshuffle-base-connector'

describe('Reshuffle', () => {
  describe('create, start and restart', () => {
    describe('create Reshuffle application', () => {
      it('creates a new app running on default port', () => {
        const app = new Reshuffle()

        expect(app.port).toEqual(8000)
        expect(app.registry).toEqual({
          common: { webserver: undefined },
          connectors: {},
          handlers: {},
        })
        expect(app.httpDelegates).toEqual({})
      })
      it('creates a new app running on a specific port', () => {
        process.env.PORT = '1234'
        const app = new Reshuffle()
        expect(app.port).toEqual(parseInt(process.env.PORT, 10))
      })
      it('creates a new app using custom logger options', () => {
        const app = new Reshuffle({ level: 'debug' })

        expect(app.getLogger().isDebugEnabled()).toBe(true)
      })
    })
    describe('start', () => {
      it('starts the app on a specific port', () => {
        const app = new Reshuffle()

        const myPort = 2345

        app.start(myPort)

        expect(app.port).toBe(myPort)
      })
      it('starts the app and invoke callback function id provided', () => {
        const callbackOnStart = jest.fn()

        const app = new Reshuffle()

        app.start(undefined, callbackOnStart)

        expect(callbackOnStart).toHaveBeenCalledTimes(1)
      })
    })
    describe('restart', () => {
      it('restarts the app', () => {
        const myPort = 6789
        const app = new Reshuffle()

        app.start = jest.fn(app.start)

        app.stopWebServer = jest.fn(app.stopWebServer)

        app.restart(myPort)

        expect(app.stopWebServer).toHaveBeenCalled()
        expect(app.start).toHaveBeenCalledWith(myPort, expect.anything())
      })
    })
  })
  describe('get, register and unregister connectors', () => {
    it('registers a connector, getConnector and unregisters it', async () => {
      const app = new Reshuffle()

      const connector = new BaseConnector(app)

      expect(Object.keys(app.registry.connectors)).toHaveLength(1)
      expect(app.getConnector(connector.id)).toBe(connector)

      await app.unregister(connector)

      expect(Object.keys(app.registry.connectors)).toHaveLength(0)
      expect(app.getConnector(connector.id)).toBe(undefined)
    })
    it('starts all registered connectors on application start', async () => {
      const app = new Reshuffle()

      const connector1 = new BaseConnector(app)
      connector1.start = jest.fn()

      const connector2 = new BaseConnector(app)
      connector2.start = jest.fn()

      const connector3 = new BaseConnector(app)
      connector3.start = jest.fn()

      expect(Object.keys(app.registry.connectors)).toHaveLength(3)

      app.start()

      expect(connector1.start).toHaveBeenCalledTimes(1)
      expect(connector2.start).toHaveBeenCalledTimes(1)
      expect(connector3.start).toHaveBeenCalledTimes(1)
    })
  })
  describe('connect event and handlers using `when`', () => {
    it('registers a new handler for the event', async (done) => {
      const app = new Reshuffle()

      const httpConnector = new HttpConnector(app)
      const cronConnector = new CronConnector(app)

      const cronHandler = jest.fn()

      httpConnector.on({ method: 'GET', path: '/test1' }, () => console.log('http'))
      cronConnector.on({ expression: '*/1 * * * * *' }, cronHandler)

      expect(Object.keys(app.registry.handlers)).toHaveLength(2)

      app.start()

      setTimeout(() => {
        expect(cronHandler).toHaveBeenCalledTimes(1)

        app.unregister(httpConnector)
        app.unregister(cronConnector)

        app.stopWebServer()

        done()
      }, 1000)
    })
    it('supports multi handlers per event', async (done) => {
      const app = new Reshuffle()

      const timerConnector = new CronConnector(app)

      const cronHandler1 = jest.fn()
      const cronHandler2 = jest.fn()

      const event = timerConnector.on({ expression: '*/1 * * * * *' }, cronHandler1)
      timerConnector.on({ expression: '*/1 * * * * *' }, cronHandler2, event.id)

      expect(app.registry.handlers[event.id]).toHaveLength(2)

      app.start()

      setTimeout(() => {
        expect(cronHandler1).toHaveBeenCalledTimes(1)
        expect(cronHandler2).toHaveBeenCalledTimes(1)
        done()

        app.stopWebServer()
      }, 1000)
    })
    it('supports passing our own Handler object', () => {
      const app = new Reshuffle()

      const timerConnector = new CronConnector(app)

      const cronHandler = { handle: (e: any) => console.log(e), id: 'myCustomId' }

      const event = timerConnector.on({ expression: '*/1 * * * *' }, cronHandler)

      expect(app.registry.handlers[event.id][0].id).toEqual('myCustomId')
    })
  })
  describe('handleEvent', () => {
    it('returns false if no handler found', async () => {
      const app = new Reshuffle()

      const connector = new BaseConnector(app)
      const anEvent = new EventConfiguration('id', connector, {})

      expect(await app.handleEvent('id', anEvent)).toBe(false)
    })
    it('keeps running when handler throw errors', async () => {
      const app = new Reshuffle()

      const connector = new BaseConnector(app)
      const anEvent = new EventConfiguration('id', connector, {})

      app.when(anEvent, () => {
        throw new Error()
      })

      expect(await app.handleEvent('id', anEvent)).toBe(false)
    })
  })
  describe('http server', () => {
    it('registers http delegate and start web server', () => {
      const app = new Reshuffle()

      expect(app.registry.common.webserver).toBeUndefined()

      const connector1 = new HttpConnector(app)
      connector1.start = jest.fn()

      const connector2 = new HttpConnector(app)
      connector2.start = jest.fn()

      app.registerHTTPDelegate('/test1', connector1)
      app.registerHTTPDelegate('/test2', connector2)

      expect(Object.keys(app.httpDelegates)).toHaveLength(2)

      app.start()

      expect(app.registry.common.webserver).toBeDefined()

      app.stopWebServer()
    })
    it('unregisters http delegate', async () => {
      const app = new Reshuffle()

      expect(app.registry.common.webserver).toBeUndefined()

      const connector1 = new HttpConnector(app)
      connector1.start = jest.fn()

      connector1.on({ method: 'GET', path: '/test1' }, () => console.log('test1'))

      expect(Object.keys(app.httpDelegates['/test1'].delegates)).toHaveLength(1)

      app.start()

      await app.unregister(connector1)

      expect(Object.keys(app.httpDelegates['/test1'].delegates)).toHaveLength(0)

      app.stopWebServer()
    })
    describe('web server', () => {
      it('can perform an healthcheck when process.env.HEALTH_CHECK_PATH is set', async () => {
        const myHealthCheckPath = '/reshuffle-healthcheck'
        const OLD_ENV = process.env
        process.env.HEALTH_CHECK_PATH = myHealthCheckPath

        const app = new Reshuffle()

        const connector = new HttpConnector(app)
        connector.on({ method: 'GET', path: '/test' }, () => console.log('test'))
        app.start()

        const response = await request(app.registry.common.webserver).get(myHealthCheckPath)
        expect(response.status).toBe(200)

        const { ok, uptime } = JSON.parse(response.text)
        expect(ok).toBe(true)
        expect(uptime).toBeGreaterThan(0)

        app.stopWebServer()
        process.env = { ...OLD_ENV }
      })
      it('delegates to the connector handler if the route matches and returns a 200', async () => {
        const app = new Reshuffle()

        expect(app.registry.common.webserver).toBeUndefined()

        const connector1 = new HttpConnector(app)
        connector1.start = jest.fn()

        const connector2 = new HttpConnector(app)
        connector2.start = jest.fn()

        const mockHandler = (key: string) =>
          jest.fn().mockImplementation((event) => event.res.end(`Success ${key}`))

        connector1.on({ method: 'GET', path: '/test1' }, mockHandler('test1'))
        connector1.on({ method: 'GET', path: '/test2' }, mockHandler('test2'))

        app.start()

        const responseTest1Call = await request(app.registry.common.webserver).get('/test1')
        expect(responseTest1Call.status).toBe(200)
        expect(responseTest1Call.text).toEqual('Success test1')

        const responseTest2Call = await request(app.registry.common.webserver).get('/test2')
        expect(responseTest2Call.status).toBe(200)
        expect(responseTest2Call.text).toEqual('Success test2')

        app.stopWebServer()
      })
      it('returns a 500 when handler throw an exception', async () => {
        const app = new Reshuffle()

        const connector = new HttpConnector(app)

        const mockHandler = () =>
          jest.fn().mockImplementation(() => {
            throw new Error(':(')
          })

        connector.on({ method: 'GET', path: '/test' }, mockHandler())

        app.start()

        const responseTest1Call = await request(app.registry.common.webserver).get('/test')
        expect(responseTest1Call.status).toEqual(500)

        app.stopWebServer()
      })
      it("returns a 501 with 'No handler registered for /route' when path matches but method doesn't", async () => {
        const app = new Reshuffle()

        expect(app.registry.common.webserver).toBeUndefined()

        const connector1 = new HttpConnector(app)
        connector1.start = jest.fn()

        connector1.on({ method: 'GET', path: '/test' }, () => console.log('test'))

        app.start()

        const responseTest3Call = await request(app.registry.common.webserver).post('/test')
        expect(responseTest3Call.status).toBe(501)
        expect(responseTest3Call.text).toEqual('No handler registered for POST /test')

        app.stopWebServer()
      })
      it("returns a 404 with 'No handler registered for /unknownPath' whe path unknown", async () => {
        const app = new Reshuffle()

        expect(app.registry.common.webserver).toBeUndefined()

        const connector1 = new HttpConnector(app)
        connector1.start = jest.fn()

        connector1.on({ method: 'GET', path: '/test' }, () => console.log('test'))

        app.start()

        const responseTest3Call = await request(app.registry.common.webserver).get('/unknownPath')
        expect(responseTest3Call.status).toBe(501)
        expect(responseTest3Call.text).toContain('No handler registered for GET /unknownPath')

        app.stopWebServer()
      })
      it("returns a 501 with 'No handler registered for /route' once the connector is unregistered", async () => {
        const app = new Reshuffle()

        expect(app.registry.common.webserver).toBeUndefined()

        const connector1 = new HttpConnector(app)

        connector1.on({ method: 'GET', path: '/test' }, (event: any) => event.res.end('Success'))

        app.start()

        const res = await request(app.registry.common.webserver).get('/test')
        expect(res.text).toContain('Success')

        await app.unregister(connector1)

        const responseTest3Call = await request(app.registry.common.webserver).get('/test')
        expect(responseTest3Call.status).toBe(501)
        expect(responseTest3Call.text).toBe('No handler registered for GET /test')

        app.stopWebServer()
      })
    })
  })
  describe('persistentStore', () => {
    it('provides a default in memory persistentStore', async () => {
      const app = new Reshuffle()
      const store = app.getPersistentStore()

      const myText = 'my text is the persistent store'
      const myObject = { first: 'foo', second: 'bar' }

      store.set('myText', myText)
      store.set('myObject', myObject)

      expect(await store.get('myText')).toEqual(myText)
      expect(await store.get('myObject')).toEqual(myObject)
    })
  })
  describe('chaining', () => {
    it('supports chaining methods', () => {
      const app = new Reshuffle()

      const connector1 = new HttpConnector(app)
      const connector2 = new CronConnector(app)

      connector1.on({ method: 'GET', path: 'test' }, () => console.log('connector1 triggered'))

      app.start()

      expect(Object.keys(app.registry.connectors)).toHaveLength(2)

      expect(connector1.started).toBe(true)
      expect(connector2.started).toBe(true)

      app.stopWebServer()
    })
  })
})
