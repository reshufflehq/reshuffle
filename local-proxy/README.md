# local-proxy

Usage: in a create-react-app directory create the file src/setupProxy.js with the contents:

```
const { setupProxy } = require('@reshuffle/local-proxy');

module.exports = setupProxy(__dirname);
```
