// tslint:disable:no-console
import * as walkdir from 'walkdir';
import { transformFileAsync } from '@babel/core';
import { dirname, relative, join as pathJoin } from 'path';
import { writeFileSync } from 'fs';
import * as mkdirp from 'mkdirp';

export async function walk(basePath: string, targetPath: string) {
  const taskTracker = {
    subscribed: () => { /* nothing */ },
    count: 0,
    add() {
      this.count++;
    },
    remove() {
      this.count--;
      if (!this.count) {
        this.subscribed();
      }
    },
    subscribe(fn: () => void) {
      this.subscribed = fn;
      if (!this.count) {
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
      const result = await transformFileAsync(f, {
        filename: f,
        plugins: ['@babel/plugin-transform-modules-commonjs'],
      });
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
  await new Promise((resolve) => {
    taskTracker.subscribe(resolve);
  });
}
