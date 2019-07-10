import * as BabelTypes from '@babel/types';

export function getFunctionName(e: BabelTypes.FunctionDeclaration, t: typeof BabelTypes): string | undefined {
  return t.isIdentifier(e.id) ? e.id.name : undefined;
}

export function isExposedStatement(node: BabelTypes.BaseNode) {
  return node.leadingComments && node.leadingComments.some((comment) => /@expose/.test(comment.value));
}
