function createRuntime(methodNames, fileId, urlOptions) {
  const runtime = {};
  for (const method of methodNames) {
    if (runtime[method]) {
      throw new Error(`Can not redefine ${method}`);
    }
    runtime[method] = (...args) => {
      // TODO: allow customizing URL
      return fetch('/invoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          handler: method,
          path: fileId.filename,
          args,
        }),
      }).then(response => {
        if (response.status >= 200 && response.status < 300) {
          return response.json();
        }
      }).then(jsonMessage => {
        return jsonMessage;
      });
    };
  }
  return runtime;
}

module.exports = { createRuntime };
