import { createMacro } from 'babel-plugin-macros';
import { parse } from '@babel/parser';
// not using since not sure if babel.types is the very same babel.types or a different version
// import * as t from '@babel/types';
import * as babelTypes from '@babel/types';
import { readFileSync } from 'fs';
import path from 'path';

function findClassMethods(ast: babelTypes.File, babel: any): string[] {
  const t: typeof babelTypes = babel.types;
  const body = ast.program.body;
  const exportDefaults = body.filter((e): e is babelTypes.ExportDefaultDeclaration => t.isExportDefaultDeclaration(e));
  if (!exportDefaults.length || !t.isClassDeclaration(exportDefaults[0].declaration)) {
    return [];
  }
  const declaration = exportDefaults[0].declaration;
  if (!t.isClassBody(declaration.body)) {
    return [];
  }
  const names = declaration.body.body.filter((node): node is babelTypes.ClassMethod => t.isClassMethod(node))
    .map((node) => (node.key as any).name);
  return names;
}

function shiftMacro({ state, babel }: any) {
  // not using passed references from arguments since doing whole file pass
  interface ShiftReplacement {
    idx: number;
    name: string;
    methods: string[];
    importedPath: string;
  }
  const t: typeof babelTypes = babel.types;
  const file: babelTypes.File = state.file.ast;
  const { body } = file.program;
  const found: ShiftReplacement[] = [];
  body.forEach((node, idx) => {
    if (t.isImportDeclaration(node)) {
      // skip absolute paths (modules)
      if (!node.source.value.startsWith('.')) return;
      // support not only ImportDefaultSpecifier in the future
      if (node.specifiers.length !== 1 || !t.isImportDefaultSpecifier(node.specifiers[0])) {
        return;
      }
      const name = node.specifiers[0].local.name;
      const dir = path.dirname(state.file.opts.filename);
      const importedFile = path.join(dir, node.source.value);
      const backendRoot = path.join(state.file.opts.root, 'backend');
      const relative = path.relative(backendRoot, importedFile);
      const isSubPath = relative && !relative.startsWith('..') && !path.isAbsolute(relative);
      if (isSubPath) {
        try {
          const resolvedImportedPath = require.resolve(importedFile);
          const content = readFileSync(resolvedImportedPath, 'utf8');
          const zz = parse(content, { sourceType: 'module' });
          const methods = findClassMethods(zz, babel);
          found.push({ idx, name, methods, importedPath: resolvedImportedPath });
        } catch (err) {
          console.error('File not found huh', err);
          throw new Error(`File ${node.source.value} not found`);
          // handle this error somehow
        }
      }
    }
  });
  if (found.length) {
    found.forEach(({ name, idx, methods, importedPath }) => {
      body.splice(idx, 1,
        t.importDeclaration(
          [t.importSpecifier(t.identifier('createRuntime'), t.identifier('createRuntime'))],
          t.stringLiteral('shift-fetch-runtime'),
        ),
        t.variableDeclaration(
          'const',
          [
            t.variableDeclarator(t.identifier(name),
              t.callExpression(t.identifier('createRuntime'), [
                t.arrayExpression(methods.map((m) => t.stringLiteral(m))),
                t.objectExpression([
                  t.objectProperty(t.stringLiteral('filename'), t.stringLiteral(importedPath)),
                ]),
              ])
            ),
          ]
        ),
      );
    });
  }
}

module.exports = createMacro(shiftMacro);
