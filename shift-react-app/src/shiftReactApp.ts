// tslint:disable:no-console

import {
  setupProxy,
  installPackages,
  ignoreShift,
} from './steps';

async function shiftReactApp() {
  try {
    setupProxy();
    await installPackages();
    ignoreShift();
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }
}

shiftReactApp();
