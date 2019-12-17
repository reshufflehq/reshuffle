export function makeContentTypeAcceptor(accept?: string | RegExp) {
  return (ct: any): boolean => {
    if (accept) {
      if (typeof ct !== 'string') {
        return false;
      }
      if (typeof accept === 'string') {
        return ct === accept;
      } else {
        return accept.test(ct);
      }
    }
    return typeof ct === 'undefined' || typeof ct === 'string';
  };
}
