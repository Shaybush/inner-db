import type { RecordedHeader, RecordedRequest } from './types';

const SKIPPED_HEADERS = new Set([
  'cookie',
  'host',
  'content-length',
  'user-agent',
  'connection',
  'accept-encoding',
  'accept-language',
  'origin',
  'referer',
  'priority',
]);

const isNoisyHeader = (name: string) => {
  const lower = name.toLowerCase();
  return SKIPPED_HEADERS.has(lower) || lower.startsWith('sec-');
};

const findHeader = (headers: RecordedHeader[], name: string) =>
  headers.find((header) => header.name.toLowerCase() === name)?.value ?? '';

const buildUrl = (rawUrl: string) => {
  const parsed = new URL(rawUrl);
  return {
    raw: rawUrl,
    protocol: parsed.protocol.replace(':', ''),
    host: parsed.hostname.split('.'),
    port: parsed.port || undefined,
    path: parsed.pathname.split('/').filter(Boolean),
    query: [...parsed.searchParams.entries()].map(([key, value]) => ({ key, value })),
  };
};

const buildBody = (request: RecordedRequest) => {
  const { body, headers } = request;
  if (!body) return undefined;
  const contentType = findHeader(headers, 'content-type').toLowerCase();

  if (body.kind === 'form') {
    const pairs = (body.form ?? []).map(({ name, value }) => ({ key: name, value }));
    const mode = contentType.includes('multipart') ? 'formdata' : 'urlencoded';
    return { mode, [mode]: pairs };
  }

  const isJson = contentType.includes('json');
  return {
    mode: 'raw',
    raw: body.raw ?? '',
    options: isJson ? { raw: { language: 'json' } } : undefined,
  };
};

export const requestName = (request: RecordedRequest) => {
  const { pathname } = new URL(request.url);
  return `${request.method} ${pathname}`;
};

export const buildCollection = (name: string, requests: RecordedRequest[]) => ({
  info: {
    name,
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  item: requests.map((request) => ({
    name: requestName(request),
    request: {
      method: request.method,
      header: request.headers
        .filter((header) => !isNoisyHeader(header.name))
        .map((header) => ({ key: header.name, value: header.value })),
      body: buildBody(request),
      url: buildUrl(request.url),
    },
  })),
});

export const downloadJson = (filename: string, data: unknown) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
};
