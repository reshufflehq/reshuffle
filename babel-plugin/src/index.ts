import * as BabelTypes from '@babel/types';
// tslint:disable-next-line:no-implicit-dependencies only used for Visitor type
import { Visitor } from '@babel/traverse';
import { getFunctionName, isExposedStatement } from '@binaris/shift-babel-common';

interface Babel {
  types: typeof BabelTypes;
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
        path.insertAfter(
          t.expressionStatement(
            t.assignmentExpression('=',
              t.memberExpression(t.identifier(funcName), t.identifier('__shiftjs__')),
              t.stringLiteral('exposed')
            )
          )
        );
      },
    },
  };
}
