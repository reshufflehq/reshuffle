import { Pipe } from './types'

export default class SimplePipe implements Pipe {
  private _chain: Array<any>

  constructor() {
    this._chain = []
  }

  makePromises(payload: any) {
    return this._chain.reduce((chain, handler) => {
      return chain.then((payload: any) => handler(payload))
    }, Promise.resolve())
  }

  flow(payload: any): Promise<any> {
    return this.makePromises(payload)
  }

  pipe(f: any): Pipe {
    this._chain.push(f)
    return this
  }
}
