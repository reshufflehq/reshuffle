const pluginTester = require('babel-plugin-tester') as any;
import plugin from 'babel-plugin-macros';
import { join } from 'path';

process.chdir(__dirname);

pluginTester({
  plugin,
  babelOptions: {
    filename: join(__filename, 'tested-file.js'),
  },
  tests: {
    "Import line is removed from output": {
      code: 'import "../../macro";',
      output: '',
    },
    "Transforms backend imports to createRuntime calls": {
      code: `
        import "../../macro";
        import { foo, bar } from '../backend/mockBackend';
      `,
      output: `
        import { createRuntime } from "@binaris/shift-fetch-runtime";
        const {
          foo,
          bar
        } = createRuntime(["foo", "bar"], {
          "filename": "mockBackend.js"
        });
      `,
    },
    "Throws if function is not exposed": {
      code: `
        import "../../macro";
        import { notExposed } from '../backend/mockBackend';
      `,
      error: 'Not found imported notExposed, did you forget to @expose',
    },
    "Throws if function is missing": {
      code: `
        import "../../macro";
        import { missingFunction } from '../backend/mockBackend';
      `,
      error: 'Not found imported missingFunction, did you forget to @expose',
    },
    "Throws if function file not exists": {
      code: `
        import "../../macro";
        import { notThere } from '../backend/missingFile';
      `,
      error: /Cannot find module/,
    },
    "Support importing from a backend file in a sub directory": {
      code: `
        import "../../macro";
        import { foo, bar } from '../backend/subdir/mockBackendInSubdir';
      `,
      output: `
        import { createRuntime } from "@binaris/shift-fetch-runtime";
        const {
          foo,
          bar
        } = createRuntime(["foo", "bar"], {
          "filename": "subdir/mockBackendInSubdir.js"
        });
      `,
    },
    "Support importing from multiple files": {
      skip: true,
      code: `
        import "../../macro";
        import { foo, bar } from '../backend/mockBackend';
        import { foo2, bar2 } from '../backend/mockBackend2';
      `,
      output: `
        import { createRuntime } from "@binaris/shift-fetch-runtime";
        const {
          foo,
          bar
        } = createRuntime(["foo", "bar"], {
          "filename": "mockBackend.js"
        });
        const {
          foo2,
          bar2
        } = createRuntime(["foo2", "bar2"], {
          "filename": "mockBackend2.js"
        });
      `,
    },
  },
})
