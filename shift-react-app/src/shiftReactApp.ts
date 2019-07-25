// tslint:disable:no-console

import {
  sanityCheck,
  setupProxy,
  installPackages,
  ignoreShift,
} from './steps';

async function shiftReactApp() {
  try {
    sanityCheck();
    let msg = setupProxy();
    console.log(msg);
    msg = await installPackages();
    console.log(msg);
    msg = ignoreShift();
    console.log(msg);
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }
}

shiftReactApp();
