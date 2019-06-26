import { createMacro } from 'babel-plugin-macros';
import { parse } from '@babel/parser';
// not using since not sure if babel.types is the very same babel.types or a different version
// import * as t from '@babel/types';
import * as babelTypes from '@babel/types';
import { readFileSync } from 'fs';
import path from 'path';

interface MacrosPluginPass {
  filename: string;
  cwd: string;
  opts: object;
  file: {
    ast: babelTypes.File,
      opts: {
        root: string,
        filename: string,
      },
  };
  key: 'macros';
}

interface MacrosBabel {
  types: typeof babelTypes;
}

function getFunctionName(e: babelTypes.FunctionDeclaration, t: typeof babelTypes): string | undefined {
  return t.isIdentifier(e.id) ? e.id.name : undefined;
}

function assertExportedMember(ast: babelTypes.File, t: typeof babelTypes, funcName: string): void {
  const { body } = ast.program;
  const isFunctionExported = body.some((e) =>
    t.isExpressionStatement(e) &&
    t.isAssignmentExpression(e.expression) &&
    e.expression.operator === '=' &&
    t.isMemberExpression(e.expression.left) &&
    t.isIdentifier(e.expression.left.object) &&
    e.expression.left.object.name === 'exports' &&
    t.isIdentifier(e.expression.left.property) &&
    e.expression.left.property.name === funcName &&
    t.isIdentifier(e.expression.right) &&
    e.expression.right.name === funcName
  );
  if (!isFunctionExported) {
    throw new Error(`${funcName} has @expose decorator but it is not exported`);
  }
}

function findExportedMethods(ast: babelTypes.File, { types: t }: MacrosBabel, importedNames: string[]): string[] {
  const { body } = ast.program;
  // support ExportDefaultDeclaration (ExportAllDeclaration too for re-exporting ?)
  const exposedStatements = body.filter((e) => e.leadingComments && e.leadingComments.some((comment) => /@expose/.test(comment.value)));
  return exposedStatements.reduce((ret: string[], e) => {
    if (t.isFunctionDeclaration(e)) {
      const funcName = getFunctionName(e, t);
      if (funcName && importedNames.includes(funcName)) {
        assertExportedMember(ast, t, funcName);
        ret.push(funcName);
      }
    } else if (t.isExportNamedDeclaration(e) && t.isFunctionDeclaration(e.declaration)) {
      const funcName = getFunctionName(e.declaration, t);
      if (funcName) {
        ret.push(funcName);
      }
    }
    return ret;
  }, []);
}

function shiftMacro({ state, babel }: { state: MacrosPluginPass, babel: MacrosBabel }) {
  // not using passed references from arguments since doing whole file pass
  interface ShiftReplacement {
    idx: number;
    names: string[];
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
      if (!node.source.value.startsWith('.')) {
        return;
      }
      if (!node.specifiers.length ) {
        return;
      }
      // support ImportDefaultSpecifier (together with default export in the future)
      if (node.specifiers.some((specifier) => t.isImportDefaultSpecifier(specifier))) {
        return;
      }
      const names = node.specifiers.map((specifier) => specifier.local.name);
      const dir = path.dirname(state.filename);
      const importedFile = path.join(dir, node.source.value);
      const backendRoot = path.join(state.file.opts.root, 'backend');
      const relative = path.relative(backendRoot, importedFile);
      const isSubPath = relative && !relative.startsWith('..') && !path.isAbsolute(relative);
      if (isSubPath) {
        let resolvedImportedPath: string;
        let content: string;
        try {
          resolvedImportedPath = require.resolve(importedFile);
          content = readFileSync(resolvedImportedPath, 'utf8');
        } catch (err) {
          throw new Error(`File ${node.source.value} could not be read ${err}`);
          // handle this error somehow
        }
        const importedFileAst = parse(content, { sourceType: 'module' });
        const methods = findExportedMethods(importedFileAst, babel, names);
        const namesSet = new Set(names);
        const methodsSet = new Set(methods);
        const difference = [...namesSet].filter((name) => !methodsSet.has(name));
        if (difference.length) {
          throw new Error(`Not found imported ${difference}, did you forget to @expose`);
        }
        found.push({ idx, names, methods, importedPath: path.relative(backendRoot, resolvedImportedPath) });
      }
    }
  });
  if (found.length) {
    found.forEach(({ names, idx, methods, importedPath }, loopIdx) => {
      // Only insert runtime on first loop
      if (loopIdx === 0) {
        body.splice(idx, 0,
          t.importDeclaration(
            [t.importSpecifier(t.identifier('createRuntime'), t.identifier('createRuntime'))],
            t.stringLiteral('@binaris/shift-fetch-runtime'),
          ),
        );
      }
      // all previously computed indices need to be shifted by 1 due to createRuntime import
      body.splice(idx + 1, 1,
        t.variableDeclaration(
          'const',
          [
            t.variableDeclarator(
              t.objectPattern(names.map((name) => t.objectProperty(
                t.identifier(name),
                t.identifier(name),
                false,
                true,
              ))),
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
