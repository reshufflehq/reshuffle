// tslint:disable:no-console

import {
  sanityCheck,
  setupProxy,
  installPackages,
  ignoreShift,
} from './steps';

const steps = [
  sanityCheck,
  setupProxy,
  installPackages,
  ignoreShift,
];

async function shiftReactApp() {
  try {
    for (const step of steps) {
      const msg = await step();
      if (msg !== undefined) {
        console.log(msg);
      }
    }
  } catch (e) {
    console.error('ABORTED:', e.message);
    process.exit(1);
  }
}

// tslint:disable-next-line:no-floating-promises all rejections handled by process.exit(1)
shiftReactApp();
