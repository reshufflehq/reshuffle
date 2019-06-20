declare module 'nodemon' {
  // export default function nodemon(options: any): void;
  interface Nodemon {
    (options: any): void;
    on(ev: string, callback: (...args: any[]) => void): this;
  }

  const nodemon: Nodemon;
  export default nodemon;
}
declare module '@babel/cli/lib/babel/dir' {
  const dir: any;
  export default dir;
}
