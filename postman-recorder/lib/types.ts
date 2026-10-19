export interface RecordedHeader {
  name: string;
  value: string;
}

export interface RecordedBody {
  kind: 'raw' | 'form';
  raw?: string;
  form?: RecordedHeader[];
}

export interface RecordedRequest {
  id: string;
  method: string;
  url: string;
  headers: RecordedHeader[];
  body?: RecordedBody;
  status?: number;
  timestamp: number;
}

export interface RecorderState {
  recording: boolean;
  tabId: number | null;
  requests: RecordedRequest[];
}

export type RecorderMessage =
  | { type: 'getState' }
  | { type: 'start'; tabId: number }
  | { type: 'stop' }
  | { type: 'clear' };
