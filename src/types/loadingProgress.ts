export interface LoadingProgress {
  phase: 'download' | 'verify' | 'unpack' | 'index' | 'ready' | 'error';
  loaded?: number;
  total?: number;
}
