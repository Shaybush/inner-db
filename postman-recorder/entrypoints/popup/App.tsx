import { useEffect, useMemo, useState } from 'react';
import { buildCollection, downloadJson, requestName } from '@/lib/postman';
import type { RecordedRequest, RecorderMessage, RecorderState } from '@/lib/types';
import './App.css';

const send = (message: RecorderMessage) =>
  chrome.runtime.sendMessage(message) as Promise<RecorderState>;

const hostOf = (request: RecordedRequest) => new URL(request.url).host;

function App() {
  const [state, setState] = useState<RecorderState>({ recording: false, tabId: null, requests: [] });
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');
  const [host, setHost] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    send({ type: 'getState' }).then(setState);
  }, []);

  const methods = useMemo(() => [...new Set(state.requests.map((r) => r.method))], [state.requests]);
  const hosts = useMemo(() => [...new Set(state.requests.map(hostOf))], [state.requests]);

  const filtered = useMemo(
    () =>
      state.requests.filter(
        (request) =>
          (!method || request.method === method) &&
          (!host || hostOf(request) === host) &&
          request.url.toLowerCase().includes(search.toLowerCase()),
      ),
    [state.requests, method, host, search],
  );

  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  const startRecording = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    setSelected(new Set());
    setState(await send({ type: 'start', tabId: tab.id }));
  };

  const stopRecording = async () => setState(await send({ type: 'stop' }));

  const clearRecording = async () => {
    setSelected(new Set());
    setState(await send({ type: 'clear' }));
  };

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const toggleAllFiltered = () =>
    setSelected((current) => {
      const next = new Set(current);
      filtered.forEach((request) => (allFilteredSelected ? next.delete(request.id) : next.add(request.id)));
      return next;
    });

  const download = () => {
    const chosen = state.requests.filter((request) => selected.has(request.id));
    downloadJson('recorded-collection.postman_collection.json', buildCollection('Recorded API', chosen));
  };

  const hasRequests = state.requests.length > 0;

  return (
    <div className='app'>
      <header className='bar'>
        <h1 className='brand'>
          <img src='/logo.png' alt='' />
          Postman Recorder
        </h1>
        {state.recording ? (
          <button className='btn stop' onClick={stopRecording}>
            Stop recording
          </button>
        ) : (
          <button className='btn primary' onClick={startRecording}>
            Start recording
          </button>
        )}
      </header>

      {state.recording && <p className='hint'>Recording this tab: {state.requests.length} requests</p>}

      {!state.recording && hasRequests && (
        <>
          <div className='filters'>
            <input placeholder='Search url' value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value=''>All methods</option>
              {methods.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select value={host} onChange={(e) => setHost(e.target.value)}>
              <option value=''>All hosts</option>
              {hosts.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>

          <label className='row all'>
            <input type='checkbox' checked={allFilteredSelected} onChange={toggleAllFiltered} />
            Select all ({filtered.length})
          </label>

          <ul className='list'>
            {filtered.map((request) => (
              <li key={request.id}>
                <label className='row'>
                  <input
                    type='checkbox'
                    checked={selected.has(request.id)}
                    onChange={() => toggle(request.id)}
                  />
                  <span className={`method ${request.method}`}>{request.method}</span>
                  <span className='path' title={request.url}>
                    {hostOf(request)}
                    {requestName(request).replace(request.method, '')}
                  </span>
                  <span className='status'>{request.status ?? ''}</span>
                </label>
              </li>
            ))}
          </ul>

          <footer className='bar'>
            <button className='btn' onClick={clearRecording}>
              Clear
            </button>
            <button className='btn primary' disabled={selected.size === 0} onClick={download}>
              Download {selected.size} for Postman
            </button>
          </footer>
        </>
      )}

      {!state.recording && !hasRequests && <p className='hint'>Press start, use the page, then stop.</p>}
    </div>
  );
}

export default App;
