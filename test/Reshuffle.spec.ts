import request from 'supertest'
import { CronConnector, HttpConnector, Reshuffle } from '../src'
import { BaseConnector } from 'reshuffle-base-connector'

describe('Reshuffle', () => {
  describe('create, start and restart', () => {
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
    describe('start', () => {
      it('starts the app on a specific port', () => {
        const app = new Reshuffle()

        const myPort = 2345

        app.start(myPort)

        expect(app.port).toBe(myPort)
      })
      it('starts the app with callback', () => {
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

        app.start = jest.fn()
        app.restart(myPort)

        expect(app.start).toHaveBeenCalledWith(myPort, expect.anything())
      })
    })
  })
  describe('get, register and unregister connectors', () => {
    it('registers a connector, getConnector and unregisters it', async () => {
      const app = new Reshuffle()

      const connector = new BaseConnector()

      app.register(connector)

      expect(Object.keys(app.registry.connectors)).toHaveLength(1)
      expect(app.getConnector(connector.id)).toBe(connector)

      await app.unregister(connector)

      expect(Object.keys(app.registry.connectors)).toHaveLength(0)
      expect(app.getConnector(connector.id)).toBe(undefined)
    })
    it('starts all registered connectors on application start', async () => {
      const app = new Reshuffle()

      const connector1 = new BaseConnector()
      connector1.start = jest.fn()
      app.register(connector1)

      const connector2 = new BaseConnector()
      connector2.start = jest.fn()
      app.register(connector2)

      const connector3 = new BaseConnector()
      connector3.start = jest.fn()
      app.register(connector3)

      expect(Object.keys(app.registry.connectors)).toHaveLength(3)

      app.start()

      expect(connector1.start).toHaveBeenCalledTimes(1)
      expect(connector2.start).toHaveBeenCalledTimes(1)
      expect(connector3.start).toHaveBeenCalledTimes(1)
    })
  })
  describe('http services', () => {
    it('registers http delegate and start web server', () => {
      const app = new Reshuffle()

      expect(app.registry.common.webserver).toBeUndefined()

      const connector1 = new HttpConnector()
      connector1.start = jest.fn()
      app.register(connector1)

      const connector2 = new HttpConnector()
      connector2.start = jest.fn()
      app.register(connector2)

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

      const connector1 = new HttpConnector()
      connector1.start = jest.fn()
      app.register(connector1)

      app.when(connector1.on({ method: 'GET', path: '/test1' }), () => console.log('test1'))

      expect(Object.keys(app.httpDelegates)).toHaveLength(1)

      app.start()

      await app.unregister(connector1)

      expect(Object.keys(app.httpDelegates)).toHaveLength(0)

      app.stopWebServer()
    })
    describe('web server', () => {
      it('delegates to the connector handler if the route matches', async () => {
        const app = new Reshuffle()

        expect(app.registry.common.webserver).toBeUndefined()

        const connector1 = new HttpConnector()
        connector1.start = jest.fn()
        app.register(connector1)

        const connector2 = new HttpConnector()
        connector2.start = jest.fn()
        app.register(connector2)

        const mockHandler = (key: string) =>
          jest.fn().mockImplementation((event) => event.context.res.end(`Success ${key}`))

        app.when(connector1.on({ method: 'GET', path: '/test1' }), mockHandler('test1'))
        app.when(connector1.on({ method: 'GET', path: '/test2' }), mockHandler('test2'))

        app.start()

        const responseTest1Call = await request(app.registry.common.webserver).get('/test1')
        expect(responseTest1Call.text).toEqual('Success test1')

        const responseTest2Call = await request(app.registry.common.webserver).get('/test2')
        expect(responseTest2Call.text).toEqual('Success test2')

        app.stopWebServer()
      })
      it("returns a 200 with 'No handler registered for /route' when path matches but method doesn't", async () => {
        const app = new Reshuffle()

        expect(app.registry.common.webserver).toBeUndefined()

        const connector1 = new HttpConnector()
        connector1.start = jest.fn()
        app.register(connector1)

        app.when(connector1.on({ method: 'GET', path: '/test1' }), () => console.log('test'))

        app.start()

        const responseTest3Call = await request(app.registry.common.webserver).post('/test')
        expect(responseTest3Call.text).toEqual('No handler registered for /test')

        app.stopWebServer()
      })
      it("returns a 200 with 'No handler registered for /route'", async () => {
        const app = new Reshuffle()

        expect(app.registry.common.webserver).toBeUndefined()

        const connector1 = new HttpConnector()
        connector1.start = jest.fn()
        app.register(connector1)

        app.when(connector1.on({ method: 'GET', path: '/test' }), () => console.log('test'))

        app.start()

        const responseTest3Call = await request(app.registry.common.webserver).get('/foobar')
        expect(responseTest3Call.text).toEqual('No handler registered for /foobar')

        app.stopWebServer()
      })
      it("returns a 200 with 'No handler registered for /route' if unregistered", async () => {
        const app = new Reshuffle()

        expect(app.registry.common.webserver).toBeUndefined()

        const connector1 = new HttpConnector()
        connector1.start = jest.fn()
        app.register(connector1)

        app.when(connector1.on({ method: 'GET', path: '/test' }), () => console.log('test'))

        app.start()

        await app.unregister(connector1)

        const responseTest3Call = await request(app.registry.common.webserver).get('/test')
        expect(responseTest3Call.text).toEqual('No handler registered for /test')

        app.stopWebServer()
      })
    })
  })
  describe('chaining', () => {
    it('supports chaining methods', () => {
      const app = new Reshuffle()

      const connector1 = new HttpConnector()
      const connector2 = new CronConnector()

      app
        .register(connector1)
        .register(connector2)
        .when(connector1.on({ method: 'GET', path: 'test' }), () =>
          console.log('connector1 triggered'),
        )
        .start()

      expect(Object.keys(app.registry.connectors)).toHaveLength(2)

      expect(connector1.started).toBe(true)
      expect(connector2.started).toBe(true)

      app.stopWebServer()
    })
  })
})
