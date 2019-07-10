import pluginTester from 'babel-plugin-tester';
import plugin from '../';

pluginTester({
  plugin,
  pluginName: '@binaris/shift-babel-plugin',
  tests: {
    'Mark @exposed functions as exposed': {
      code: `
        // @expose
        export async function hello() {
          return 42;
        }
      `,
      output: `
        // @expose
        export async function hello() {
          return 42;
        }
        hello.__shiftjs__ = "exposed";
      `,
    },
  },
});
