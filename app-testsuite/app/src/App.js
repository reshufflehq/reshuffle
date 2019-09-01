import '@binaris/shift-code-transform/macro';
import React, { useState, useEffect } from 'react';
import { get, update } from '../backend/index';

const Counter = ({ keyName }) => {
  const [{ loading, data, error }, setState] = useState({ loading: true });
  useEffect(() => {
    if (loading) {
      get(keyName)
        .then(count => setState({ data: count || 0 }))
        .catch((error) => setState({ error }));
    }
  });
  const increment = () => {
    update(keyName, data + 1)
      .then(count => setState({ data: count || 0 }))
      .catch((error) => setState({ error }));
  };

  if (loading) {
    return <div className='loading'>loading...</div>;
  }
  if (error) {
    return  <div className='error'>error: {error}</div>;
  }
  return (<>
    <span className='counter'>{data}</span>
    <input type="button" onClick={increment} value="Increment" />
  </>);
}

function App() {
  return <Counter keyName='counter' />
}

export default App;
