declare module 'nodemon' {
  // export default function nodemon(options: any): void;
  interface Nodemon {
    (options: any): void;
    on(ev: string, callback: (...args: any[]) => void): this;
  }

  const nodemon: Nodemon;
  export default nodemon;
}
