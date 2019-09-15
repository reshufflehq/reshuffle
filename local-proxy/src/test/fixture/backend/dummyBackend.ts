export function hello() {
  return 'hello';
}

hello.__reshuffle__ = { exposed: true };
