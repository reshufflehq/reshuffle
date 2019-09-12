[![CircleCI](https://circleci.com/gh/reshufflehq/reshuffle.svg?style=svg)](https://circleci.com/gh/reshufflehq/reshuffle.svg?style=svg)
# Reshuffle

Reshuffle works best with a new Create-React-App project:

```shell
$ npx create-react-app my-new-app
$ cd my-new-app
```

From the app directory you can install Reshuffle with:

```shell
$ npx @reshuffle/react-app
```

From now you can begin using Reshuffle by launching

```shell
$ npm start
```

For using backend functions inside a frontend file you need to import the Reshuffle macro first like this.

```javascript
import '@reshuffle/code-transform/macro';
```

You can create a backend file in the backend directory, for example `backend/HelloBackend.js`

```javascript
// @expose
export async function hello(name) {
  return 'hello ' + name;
}
```

You can call get a reference to this function by importing it from a front-end code like

```javascript
import { hello } from '../backend/HelloBackend';
```

Now you can call the function as usual by using:

```javascript
hello('World');
```

The `@resuffle/db` package was installed, you can require it in backend code like:

```javascript
import { create } from '@reshuffle/db';
```
