// tslint:disable:no-console
import {
  readFileSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import findLastIndex from 'lodash.findlastindex';
import { spawn } from 'child_process';

export function setupProxy() {
  const proxyFile = join('src', 'setupProxy.js');
  const proxyCode = `const { setupProxy } = require('@binaris/shift-local-proxy');
module.exports = setupProxy(__dirname);
`;
  writeFileSync(proxyFile, proxyCode, { flag: 'wx' });
  console.log(`Created ${proxyFile}, please commit this file`);
}

export function installPackages() {
  return new Promise((resolve, reject) => {
    const dependencies = [
      '@binaris/shift-local-proxy',
      '@binaris/shift-babel-macro',
      '@binaris/shift-fetch-runtime',
      '@binaris/shift-db',
    ];
    const args = [
      'install',
      '--save',
      '--loglevel',
      'error',
    ].concat(dependencies);
    const child = spawn('npm', args, { stdio: 'inherit' });
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Could not install ${dependencies.join(' ')}`));
        return;
      }
      console.log('Packages installed');
      console.log('Modified package.json, please commit this file');
      resolve();
    });
  });
}

export function ignoreShift() {
  const gitIgnoreFile = '.gitignore';
  const ignorePattern = '.shift*';
  try {
    const initialContent = readFileSync(gitIgnoreFile, { encoding: 'utf8' });
    const lines: string[] = initialContent.split('\n');
    const found = lines.find((line) => line === ignorePattern);
    if (found) {
      console.log(`Did not need to update ${gitIgnoreFile}`);
    } else {
      const lastIndex = findLastIndex(lines, (line: string) => !!line.trim ().length ) || 0;
      lines.splice(lastIndex + 1, 0, ignorePattern);
      const newContent = lines.join('\n');
      writeFileSync(gitIgnoreFile, newContent);
      console.log(`Updated ${gitIgnoreFile}, please commit this file`);
    }
  } catch (e) {
    console.log(`Did not update ${gitIgnoreFile}`);
  }
}
