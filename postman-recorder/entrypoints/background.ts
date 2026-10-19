import type { RecordedBody, RecorderMessage, RecorderState } from '@/lib/types';

const STORAGE_KEY = 'recorderState';
const IGNORED_METHODS = new Set(['OPTIONS']);
const FILTER = { urls: ['<all_urls>'], types: ['xmlhttprequest' as const] };

type BeforeRequestDetails = chrome.webRequest.OnBeforeRequestDetails;
type SendHeadersDetails = chrome.webRequest.OnSendHeadersDetails;
type CompletedDetails = chrome.webRequest.OnCompletedDetails;

const emptyState = (): RecorderState => ({ recording: false, tabId: null, requests: [] });

const decodeRawBody = (raw: chrome.webRequest.UploadData[]) => {
  const decoder = new TextDecoder();
  return raw.map((part) => (part.bytes ? decoder.decode(part.bytes) : '')).join('');
};

const parseBody = (requestBody: BeforeRequestDetails['requestBody']): RecordedBody | undefined => {
  if (requestBody?.raw?.length) {
    return { kind: 'raw', raw: decodeRawBody(requestBody.raw) };
  }
  if (requestBody?.formData) {
    const fields = requestBody.formData as Record<string, string[]>;
    const form = Object.entries(fields).flatMap(([name, values]) =>
      values.map((value) => ({ name, value })),
    );
    return { kind: 'form', form };
  }
  return undefined;
};

export default defineBackground(() => {
  let state: RecorderState = emptyState();

  const ready = chrome.storage.session
    .get(STORAGE_KEY)
    .then((stored) => {
      const saved = stored[STORAGE_KEY] as RecorderState | undefined;
      if (saved) state = saved;
    });

  const persist = () => chrome.storage.session.set({ [STORAGE_KEY]: state });

  const updateBadge = () => {
    const text = state.recording ? String(state.requests.length) : '';
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
  };

  const isTracked = (details: { tabId: number; method: string }) =>
    state.recording && details.tabId === state.tabId && !IGNORED_METHODS.has(details.method);

  const findRequest = (requestId: string) => state.requests.find((item) => item.id === requestId);

  const recordRequest = async (details: BeforeRequestDetails) => {
    await ready;
    if (!isTracked(details)) return;
    state.requests.push({
      id: details.requestId,
      method: details.method,
      url: details.url,
      headers: [],
      body: parseBody(details.requestBody),
      timestamp: Date.now(),
    });
    updateBadge();
    await persist();
  };

  const recordHeaders = async (details: SendHeadersDetails) => {
    await ready;
    if (!isTracked(details)) return;
    const request = findRequest(details.requestId);
    if (!request) return;
    request.headers = (details.requestHeaders ?? []).map((header) => ({
      name: header.name,
      value: header.value ?? '',
    }));
    await persist();
  };

  const recordStatus = async (details: CompletedDetails) => {
    await ready;
    if (!isTracked(details)) return;
    const request = findRequest(details.requestId);
    if (!request) return;
    request.status = details.statusCode;
    await persist();
  };

  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      void recordRequest(details);
      return undefined;
    },
    FILTER,
    ['requestBody'],
  );

  chrome.webRequest.onSendHeaders.addListener(
    (details) => {
      void recordHeaders(details);
    },
    FILTER,
    ['requestHeaders', 'extraHeaders'],
  );

  chrome.webRequest.onCompleted.addListener((details) => {
    void recordStatus(details);
  }, FILTER);

  const handleMessage = async (message: RecorderMessage) => {
    await ready;
    if (message.type === 'start') state = { recording: true, tabId: message.tabId, requests: [] };
    if (message.type === 'stop') state = { ...state, recording: false };
    if (message.type === 'clear') state = emptyState();
    updateBadge();
    await persist();
    return state;
  };

  chrome.runtime.onMessage.addListener((message: RecorderMessage, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse);
    return true;
  });
});
