import '@reshuffle/code-transform/macro';
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';

import { get, update, getSecret } from '../backend/index';
import { notExposed, invalidFile } from './hack';

const useGetter = (getter) => {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    (async () => {
      if (state.loading) {
        try {
          const data = await getter();
          setState({ data });
        } catch (error) {
          setState({ error: error.toString() });
        }
      }
    })();
  }, [getter, state, setState]);
  return [state, setState];
}

const stateful = ({ loading, error, data }, ready) => {
  if (loading) {
    return <div className='loading'>loading...</div>;
  }
  if (error) {
    return  <div className='error'>error: {error}</div>;
  }
  return ready(data);
}

const Counter = ({ keyName }) => {
  const getter = useCallback(() => get(keyName), [keyName]);
  const [state, setState] = useGetter(getter);

  const increment = useCallback(async () => {
    try {
      const data = await update(keyName, (state.data || 0) + 1);
      setState({ data });
    } catch (error) {
      setState({ error: error.toString() });
    }
  }, [keyName, setState, state]);

  return stateful(state, (data) => (<div>
    <span className='counter'>{data || 0}</span>
    <input type="button" onClick={increment} value="Increment" />
  </div>));
}

const Secret = () => {
  const [state] = useGetter(getSecret);
  return stateful(state, (data) => (<div className='secret'>{data}</div>));
}

const NotExposed = () => {
  const [state] = useGetter(notExposed);
  return <div className='notExposed'>{stateful(state, (data) => (<div className='hacked'>{data}</div>))}</div>;
}

const InvalidFile = () => {
  const [state] = useGetter(invalidFile);
  return <div className='invalidFile'>{stateful(state, (data) => (<div className='hacked'>{data}</div>))}</div>;
}

const ExpressHandler = () => {
  const [state] = useGetter(() => fetch('/express/hello').then((body) => body.text()));
  return stateful(state, (data) => (<div className='express'>{data}</div>));
}

const ExpressVariablesHandler = () => {
  const [state] = useGetter(() => fetch('/express/variables').then((body) => body.json()));
  return stateful(
    state,
    (data) => (
      <div className='express-variables'>
        url:{data.url} originalUrl:{data.originalUrl} baseUrl:{data.baseUrl}
      </div>
    )
  );
}

function App() {
  return (<>
    <Router>
      <Switch>
        <Route exact path='/'>
          <Counter keyName='counter' />
          <Secret />
          <NotExposed />
          <InvalidFile />
        </Route>
        <Route exact path='/express'>
          <ExpressHandler />
          <ExpressVariablesHandler />
        </Route>
      </Switch>
    </Router>
  </>);
}

export default App;
