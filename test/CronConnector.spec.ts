import request from 'supertest'
import { CronConnector, HttpConnector, Reshuffle } from '../src'
import { BaseConnector } from 'reshuffle-base-connector'
import EventConfiguration from 'reshuffle-base-connector/dist/EventConfiguration'

describe('CronConnector', () => {
  describe('create, start and stop', () => {
    it('creates a new cron connector', () => {
      const app = new Reshuffle()

      expect(app.port).toEqual(8000)
      expect(app.registry).toEqual({
        common: { webserver: undefined },
        connectors: {},
        handlers: {},
      })
      expect(app.httpDelegates).toEqual({})
    })
  })
})
