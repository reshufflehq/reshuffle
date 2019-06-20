import babel from '@babel/cli/lib/babel/dir';

const [sourcePath, compiledPath] = process.argv.slice(-2);

babel({
  cliOptions: {
    filenames: [sourcePath],
    outDir: compiledPath,
  },
  babelOptions: {
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  },
}).catch((err: any) => {
  console.error(err);
  process.exit(1);
});
