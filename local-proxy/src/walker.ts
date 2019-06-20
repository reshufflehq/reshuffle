// tslint:disable:no-console
import * as walkdir from 'walkdir';
import { transformFileAsync, BabelFileResult } from '@babel/core';
import { dirname, relative, join as pathJoin } from 'path';
import { writeFileSync } from 'fs';
import * as mkdirp from 'mkdirp';

export async function walk(basePath: string, targetPath: string) {
  const taskTracker = {
    subscribed: () => { /* nothing */ },
    subscribedErr: (_err: any) => { /* nothing */ },
    count: 0,
    lastError: null,
    add() {
      this.count++;
    },
    remove() {
      this.count--;
      if (!this.count) {
        this.onEnd();
      }
    },
    subscribe(fn: () => void, errFn: () => void) {
      this.subscribed = fn;
      this.subscribedErr = errFn;
      if (!this.count) {
        this.onEnd();
      }
    },
    onEnd() {
      if (this.lastError) {
        this.subscribedErr(this.lastError);
      } else {
        this.subscribed();
      }
    },
  };
  await new Promise((resolve, reject) => {
    const emitter = walkdir.find(basePath, {
      filter: (_directory: string, files: string[]) => {
        return files.filter((f) => f !== 'node_modules');
      },
    });
    emitter.on('file', async (f) => {
      if (!f.endsWith('.js')) {
        return;
      }
      const relName = relative(basePath, f);
      const relDir = dirname(relName);
      taskTracker.add();
      let result: BabelFileResult | null;
      try {
        result = await transformFileAsync(f, {
          filename: f,
          plugins: ['@babel/plugin-transform-modules-commonjs'],
        });
      } catch (err) {
        taskTracker.lastError = err;
        result = null;
      }
      if (!result) {
        taskTracker.remove();
        return;
      }
      // TODO: extract the @exposed functions from ast for server
      const { code } = result;
      mkdirp.sync(pathJoin(targetPath, relDir));
      writeFileSync(pathJoin(targetPath, relName), code);
      taskTracker.remove();
    });
    emitter.on('end', resolve);
    emitter.on('error', reject);
  });
  await new Promise((resolve, reject) => {
    taskTracker.subscribe(resolve, reject);
  });
}
