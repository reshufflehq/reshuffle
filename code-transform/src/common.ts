import * as BabelTypes from '@babel/types';

export function getFunctionName(e: BabelTypes.FunctionDeclaration, t: typeof BabelTypes): string | undefined {
  return t.isIdentifier(e.id) ? e.id.name : undefined;
}

interface WithBabelLeadingComments {
  leadingComments: ReadonlyArray<BabelTypes.Comment> | null;
}

export function isExposedStatement(node: WithBabelLeadingComments) {
  return node.leadingComments && node.leadingComments.some((comment) => /@expose/.test(comment.value));
}

export function isTypeScriptGeneratedExport(e: object, t: typeof BabelTypes, funcName: string) {
  return t.isExpressionStatement(e) &&
    t.isAssignmentExpression(e.expression) &&
    e.expression.operator === '=' &&
    t.isMemberExpression(e.expression.left) &&
    t.isIdentifier(e.expression.left.object) &&
    e.expression.left.object.name === 'exports' &&
    t.isIdentifier(e.expression.left.property) &&
    e.expression.left.property.name === funcName &&
    t.isIdentifier(e.expression.right) &&
    e.expression.right.name === funcName;
}
