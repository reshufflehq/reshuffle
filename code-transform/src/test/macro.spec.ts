import pluginTester from 'babel-plugin-tester';
import plugin from 'babel-plugin-macros';
import { join } from 'path';

process.chdir(__dirname);

pluginTester({
  plugin,
  babelOptions: {
    filename: join(__dirname, 'babel-output', 'tested-file.js'),
  },
  tests: {
    'Import line is removed from output': {
      code: 'import "../../macro";',
      output: '',
    },
    'Transforms backend imports to createRuntime calls': {
      code: `
        import "../../macro";
        import { foo, bar } from '../backend/mockBackend';
      `,
      output: `
        import { createRuntime } from "@reshuffle/fetch-runtime";
        const { foo, bar } = createRuntime(["foo", "bar"], {
          filename: "mockBackend.js"
        });
      `,
    },
    'Throws if function is not exposed': {
      code: `
        import "../../macro";
        import { notExposed } from '../backend/mockBackend';
      `,
      error: '"notExposed" is missing from "../backend/mockBackend", did you forget to @expose ?',
    },
    'Throws if function is missing': {
      code: `
        import "../../macro";
        import { missingFunction } from '../backend/mockBackend';
      `,
      error: '"missingFunction" is missing from "../backend/mockBackend", did you forget to @expose ?',
    },
    'Throws if function file not exists': {
      code: `
        import "../../macro";
        import { notThere } from '../backend/missingFile';
      `,
      error: /Cannot find module/,
    },
    'Throws if function file can not be parsed': {
      code: `
        import "../../macro";
        import { notThere } from '../backend/mockBackendParse';
      `,
      error: /File .*mockBackendParse.js parse error SyntaxError: Unexpected token \(1:9\)/,
    },
    'Throws if function is not exported and has @expose decorator': {
      code: `
        import "../../macro";
        import { notExported } from '../backend/mockBackend';
      `,
      error: 'notExported has @expose decorator but it is not exported',
    },
    'Support importing from a backend file in a sub directory': {
      code: `
        import "../../macro";
        import { foo, bar } from '../backend/subdir/mockBackendInSubdir';
      `,
      output: `
        import { createRuntime } from "@reshuffle/fetch-runtime";
        const { foo, bar } = createRuntime(["foo", "bar"], {
          filename: "subdir/mockBackendInSubdir.js"
        });
      `,
    },
    'Support importing from multiple files': {
      code: `
        import "../../macro";
        import { foo, bar } from '../backend/mockBackend';
        import { foo2, bar2 } from '../backend/mockBackend2';
      `,
      output: `
        import { createRuntime } from "@reshuffle/fetch-runtime";
        const { foo, bar } = createRuntime(["foo", "bar"], {
          filename: "mockBackend.js"
        });
        const { foo2, bar2 } = createRuntime(["foo2", "bar2"], {
          filename: "mockBackend2.js"
        });
      `,
    },
    'Supports TypeScript output': {
      code: `
        import "../../macro";
        import { foo, bar } from '../backend/mockTypeScriptBackend';
      `,
      output: `
        import { createRuntime } from "@reshuffle/fetch-runtime";
        const { foo, bar } = createRuntime(["foo", "bar"], {
          filename: "mockTypeScriptBackend.js"
        });
      `,
    },
  },
});
