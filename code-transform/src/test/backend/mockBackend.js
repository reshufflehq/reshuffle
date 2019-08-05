// @expose
export function foo() {
  console.log('foo() was called');
}

// @expose
export function bar() {
  console.log('bar() was called');
}

export function notExposed() {
  console.log('notExposed() was called');
}

// @expose
function notExported() {
  console.log('notExposed() was called');
}
