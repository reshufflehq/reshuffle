import '@binaris/shift-code-transform/macro';
import React, { useState, useEffect, useCallback } from 'react';
import { get, update, getSecret } from '../backend/index';

const Stateful = ({ getter, children }) => {
  const [{ loading, data, error }, setState] = useState({ loading: true });
  useEffect(() => {
    if (loading) {
      getter()
        .then((data) => setState({ data }))
        .catch((error) => setState({ error }));
    }
  });

  if (loading) {
    return <div className='loading'>loading...</div>;
  }
  if (error) {
    return  <div className='error'>error: {error}</div>;
  }
  return children({ data, setState });
}

const CounterDisplay = ({ data, setState, keyName }) => {
  const increment = useCallback(() => {
    update(keyName, data + 1)
      .then((data) => setState({ data }))
      .catch((error) => setState({ error }));
  }, [keyName, setState, data]);
  return (<div>
    <span className='counter'>{data}</span>
    <input type="button" onClick={increment} value="Increment" />
  </div>);
}

const Counter = ({ keyName }) => {
  const getter = useCallback(() => get(keyName), [keyName]);

  return (<Stateful getter={getter}>{(props) => <CounterDisplay {...props} keyName={keyName} />}</Stateful>);
}

const SecretDisplay = ({ data }) => (<div className='secret'>{data}</div>);

const Secret = () => <Stateful getter={getSecret}>{(props) => <SecretDisplay {...props} />}</Stateful>;

function App() {
  return (<>
    <Counter keyName='counter' />
    <Secret />
  </>);
}

export default App;
