function createRuntime(methodNames, fileId, urlOptions) {
  return function Runtime() {
    for (const method of methodNames) {
      if (this[method]) {
        throw new Error(`Can not redefine ${method}`);
      }
      this[method] = function(...args) {
        return fetch('/__shift__', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            method,
            fileId,
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
  };
}

module.exports = { createRuntime };
