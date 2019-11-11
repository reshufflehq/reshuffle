// @expose
export async function testStackTrace() {
  throw new Error('ErrorWithStack');
}
