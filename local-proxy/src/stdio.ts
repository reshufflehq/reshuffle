import hooks from 'async_hooks';
import _ from 'lodash';
import bunyan from 'bunyan';
import util from 'util';
import path from 'path';
import RotatingFileStream from 'bunyan-rotating-file-stream';

const MAX_REGISTRY_ENTRIES = 10000;

class RequestIdRegistry {
  public trigToReqId: Map<number, string> = new Map();
  public unregisterQueue: Set<string> = new Set();

  constructor(public logger: bunyan) {}

  public size() {
    return this.trigToReqId.size;
    // TODO: get size more efficiently. keep a counter ourselves?
  }

  public register(queryId: string) {
    if (queryId) {
      const id = hooks.executionAsyncId();
      this.trigToReqId.set(id, queryId);
    }
  }

  public track(id: number, trigger: number) {
    const queryId = this.lookup(trigger);
    if (queryId) {
      this.trigToReqId.set(id, queryId);
    }
  }

  public lookup(id?: number) {
    return this.trigToReqId.get(id || hooks.executionAsyncId());
  }

  public unregister(queryId: string) {
    if (!queryId) {
      return;
    }
    this.unregisterQueue.add(queryId);
    if (this.size() > MAX_REGISTRY_ENTRIES) {
      for (const [key, val] of this.trigToReqId) {
        if (this.unregisterQueue.has(val)) {
          this.trigToReqId.delete(key);
        }
      }
      this.unregisterQueue.clear();
    }
  }
}

function uncaughtHandler(err: any) {
  // TODO: stack trace
  if (err.message) {
    process.stderr.write(err.message);
    process.stderr.end();
    process.stderr.on('finish', () => {
      process.exit(1);
    });
  }
}

export function initRegistry(logDir: string) {
  const logger = bunyan.createLogger({
    name: 'local-runtime',
    streams: [{
      type: 'raw',
      stream: new RotatingFileStream({
        path: path.join(logDir, 'shitjs.log'),
        totalFiles: 1,         // keep 1 back copy
        rotateExisting: false, // Give ourselves a clean file when we start up, based on period
        threshold: '10m',      // Rotate log files larger than 10 megabytes
        totalSize: '20m',      // Don't keep more than 20mb of archived log files
        gzip: false,           // Compress the archive log files to save space
      }),
    }],
  });

  const registry = new RequestIdRegistry(logger);

  function decoratedStreamWrite(
    // tslint:disable-next-line:ban-types
    origWrite: Function,
    origStream: NodeJS.WriteStream,
    isErr: boolean,
    chunk: string | Buffer,
    // tslint:disable-next-line:ban-types
    encoding?: string | Function,
    // tslint:disable-next-line:ban-types
    cb?: Function
  ): boolean {
    const payload = Buffer.isBuffer(chunk)
      ? chunk.toString('utf8')
      : typeof encoding === 'string' ? new Buffer(chunk, encoding).toString('utf8') : chunk;
    logger.info({ reqid: registry.lookup() || 'global', isErr }, payload);
    return origWrite.apply(origStream, [chunk, encoding, cb]);
  }
  const origStdoutWrite = process.stdout.write;
  // tslint:disable-next-line:ban-types
  function hookedStdoutWrite(chunk: string | Buffer, encoding?: string | Function, cb?: Function) {
    return decoratedStreamWrite(origStdoutWrite, process.stdout, false, chunk, encoding, cb);
  }
  process.stdout.write = hookedStdoutWrite;

  const origStderrWrite = process.stderr.write;
  // tslint:disable-next-line:ban-types
  function hookedStderrWrite(chunk: string | Buffer, encoding?: string | Function, cb?: Function) {
    return decoratedStreamWrite(origStderrWrite, process.stderr, true, chunk, encoding, cb);
  }
  process.stderr.write = hookedStderrWrite;

  try {
    // eslint-disable-next-line
    hooks.createHook({
      init: (asyncId: number, _type: string, triggerAsyncId: number) => {
        // When a new Async context is created, we keep track of which context caused it
        // to be created. Thus we "chain" the async IDs, or at least get them all to point
        // to the relevant request ID from the async context of the Express handler.
        registry.track(asyncId, triggerAsyncId);
      },
    }).enable();

    process.on('uncaughtException', uncaughtHandler);
  } catch (err) {
    origStderrWrite(util.format(err) + '\n');
    throw err;
  }

  return registry;
}
