export interface Pipe {
  pipe: (f: any) => Pipe
  flow: (payload: any) => Promise<any>
}
