import * as BabelTypes from '@babel/types';
// tslint:disable-next-line:no-implicit-dependencies only used for Visitor and NodePath types
import { Visitor, NodePath } from '@babel/traverse';
import { getFunctionName, isExposedStatement, isTypeScriptGeneratedExport } from '@binaris/shift-babel-common';

interface Babel {
  types: typeof BabelTypes;
}

function insertExpose(path: NodePath<BabelTypes.Node>, t: typeof BabelTypes, funcName: string) {
  path.insertAfter(
    t.expressionStatement(
      t.assignmentExpression('=',
        t.memberExpression(t.identifier(funcName), t.identifier('__shiftjs__')),
        t.objectExpression([
          t.objectProperty(t.identifier('exposed'), t.booleanLiteral(true)),
        ]),
      )
    )
  );
}

export default function({ types: t }: Babel): { visitor: Visitor<object> } {
  return {
    visitor: {
      ExportNamedDeclaration(path) {
        const { node } = path;
        if (!isExposedStatement(node)) {
          return;
        }
        const { declaration } = node;
        if (!t.isFunctionDeclaration(declaration)) {
          return;
        }
        const funcName = getFunctionName(declaration, t);
        if (!funcName) {
          return;
        }
        insertExpose(path, t, funcName);
      },
      FunctionDeclaration(path) {
        if (!t.isProgram(path.parent)) return;
        const { node } = path;
        if (!isExposedStatement(node)) {
          return;
        }
        const funcName = getFunctionName(node, t);
        if (!funcName) {
          return;
        }
        const sibling = path.getSibling(path.key as number + 1);
        if (!isTypeScriptGeneratedExport(sibling.node, t, funcName)) {
          throw new Error(`${funcName} has @expose decorator but it is not exported`);
        }
        insertExpose(path, t, funcName);
      },
    },
  };
}
