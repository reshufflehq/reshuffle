declare module 'nodemon' {
  import { EventEmitter } from 'events';
  // export default function nodemon(options: any): void;
  interface Nodemon extends EventEmitter {
    (options: any): void;
  }

  const nodemon: Nodemon;
  export default nodemon;
}
declare module '@babel/cli/lib/babel/dir' {
  const dir: any;
  export default dir;
}
