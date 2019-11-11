declare module 'nodemon' {
  import { EventEmitter } from 'events';
  // export default function nodemon(options: any): Nodemon;
  interface Nodemon extends EventEmitter {
    (options: any): Nodemon;
  }

  const nodemon: Nodemon;
  export default nodemon;
}
declare module '@babel/cli/lib/babel/dir' {
  const dir: any;
  export default dir;
}
